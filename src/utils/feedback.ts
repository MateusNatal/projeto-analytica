import Papa from "papaparse"

import {
  CHOICE_QUESTIONS,
  FEEDBACK_QUESTIONS,
  MAX_OTHER_LENGTH,
  MAX_SUGGESTIONS_LENGTH,
  ROAS_OPTIONS,
  optionLabel,
  type ChoiceQuestion,
  type FeedbackOption,
  type RoasLevel,
} from "./feedbackOptions"

// Tipos ----------------------------------------------------------------------

export type RoasBeforeSource = "pre_use" | "retrospective"

// O que é enviado ao banco (mesmas colunas de feedback_responses).
export interface FeedbackSubmission {
  respondent_id: string
  knowledge_level: string
  ease_of_use: string
  indicators_understood: string
  ai_helpfulness: string
  decision_ready: string
  main_difficulty: string
  main_difficulty_other: string | null
  suggestions: string | null
  roas_before: RoasLevel
  roas_after: RoasLevel
  roas_before_source: RoasBeforeSource
  roas_before_answered_at: string | null
}

// O que o painel administrativo lê.
export interface FeedbackResponse extends FeedbackSubmission {
  id: string
  created_at: string
}

// Estado do formulário: "" quando a pergunta ainda não foi respondida.
export interface FeedbackFormValues {
  choices: Record<ChoiceQuestion, string>
  otherDifficulty: string
  suggestions: string
  roasBefore: string
  roasAfter: string
}

export type FeedbackField = ChoiceQuestion | "otherDifficulty" | "suggestions" | "roasBefore" | "roasAfter"

export type FeedbackErrors = Partial<Record<FeedbackField, string>>

// Resposta "antes" guardada no navegador no primeiro acesso.
export interface PreUseAnswer {
  level: RoasLevel
  answeredAt: string
}

export function emptyFeedbackForm(): FeedbackFormValues {
  return {
    choices: Object.fromEntries(
      CHOICE_QUESTIONS.map((question) => [question, ""])
    ) as Record<ChoiceQuestion, string>,
    otherDifficulty: "",
    suggestions: "",
    roasBefore: "",
    roasAfter: "",
  }
}

// Validação ------------------------------------------------------------------

const REQUIRED_MESSAGE = "Escolha uma opção."

function isRoasLevel(value: string): value is RoasLevel {
  return ROAS_OPTIONS.some((option) => option.value === value)
}

function isValidChoice(question: ChoiceQuestion, value: string): boolean {
  return (FEEDBACK_QUESTIONS[question].options as readonly FeedbackOption[]).some(
    (option) => option.value === value
  )
}

export function validateFeedback(
  values: FeedbackFormValues,
  preUse: PreUseAnswer | null,
  respondentId: string
):
  | { ok: true; submission: FeedbackSubmission }
  | { ok: false; errors: FeedbackErrors } {
  const errors: FeedbackErrors = {}

  for (const question of CHOICE_QUESTIONS) {
    if (!isValidChoice(question, values.choices[question])) {
      errors[question] = REQUIRED_MESSAGE
    }
  }

  const other = values.otherDifficulty.trim()

  if (values.choices.main_difficulty === "other") {
    if (!other) {
      errors.otherDifficulty = "Conte qual foi a dificuldade."
    } else if (other.length > MAX_OTHER_LENGTH) {
      errors.otherDifficulty = `Use no máximo ${MAX_OTHER_LENGTH} caracteres.`
    }
  }

  const suggestions = values.suggestions.trim()

  if (suggestions.length > MAX_SUGGESTIONS_LENGTH) {
    errors.suggestions = `Use no máximo ${MAX_SUGGESTIONS_LENGTH} caracteres.`
  }

  // A resposta "antes" vem do primeiro acesso; se não existir, é pedida no
  // formulário e registrada como retrospectiva.
  const roasBefore = preUse?.level ?? values.roasBefore

  if (!isRoasLevel(roasBefore)) {
    errors.roasBefore = REQUIRED_MESSAGE
  }

  if (!isRoasLevel(values.roasAfter)) {
    errors.roasAfter = REQUIRED_MESSAGE
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    submission: {
      respondent_id: respondentId,
      knowledge_level: values.choices.knowledge_level,
      ease_of_use: values.choices.ease_of_use,
      indicators_understood: values.choices.indicators_understood,
      ai_helpfulness: values.choices.ai_helpfulness,
      decision_ready: values.choices.decision_ready,
      main_difficulty: values.choices.main_difficulty,
      main_difficulty_other:
        values.choices.main_difficulty === "other" ? other : null,
      suggestions: suggestions || null,
      roas_before: roasBefore as RoasLevel,
      roas_after: values.roasAfter as RoasLevel,
      roas_before_source: preUse ? "pre_use" : "retrospective",
      roas_before_answered_at: preUse?.answeredAt ?? null,
    },
  }
}

// Estatísticas do painel -----------------------------------------------------

export interface OptionCount {
  value: string
  label: string
  count: number
  percent: number
}

function percent(count: number, total: number): number {
  return total === 0 ? 0 : (count / total) * 100
}

export function countAnswers(
  responses: { [key: string]: unknown }[],
  field: string,
  list: readonly FeedbackOption[]
): OptionCount[] {
  const total = responses.length

  return list.map((option) => {
    const count = responses.filter((response) => response[field] === option.value).length
    return { value: option.value, label: option.label, count, percent: percent(count, total) }
  })
}

export function countChoice(
  responses: FeedbackResponse[],
  question: ChoiceQuestion
): OptionCount[] {
  return countAnswers(
    responses as unknown as { [key: string]: unknown }[],
    question,
    FEEDBACK_QUESTIONS[question].options
  )
}

const ROAS_RANK: Record<RoasLevel, number> = {
  cannot: 0,
  vague: 1,
  can_explain: 2,
}

export interface RoasComparison {
  total: number
  before: OptionCount[]
  after: OptionCount[]
  improved: number
  same: number
  worse: number
  preUse: number
  retrospective: number
  // Mesmos números, só com quem respondeu o "antes" antes de usar.
  preUseOnly: { total: number; improved: number; same: number; worse: number }
}

function compareLevels(responses: FeedbackResponse[]) {
  let improved = 0
  let same = 0
  let worse = 0

  for (const response of responses) {
    const change = ROAS_RANK[response.roas_after] - ROAS_RANK[response.roas_before]

    if (change > 0) improved++
    else if (change < 0) worse++
    else same++
  }

  return { total: responses.length, improved, same, worse }
}

export function compareRoas(responses: FeedbackResponse[]): RoasComparison {
  const rows = responses as unknown as { [key: string]: unknown }[]
  const preUseResponses = responses.filter(
    (response) => response.roas_before_source === "pre_use"
  )

  return {
    ...compareLevels(responses),
    before: countAnswers(rows, "roas_before", ROAS_OPTIONS),
    after: countAnswers(rows, "roas_after", ROAS_OPTIONS),
    preUse: preUseResponses.length,
    retrospective: responses.length - preUseResponses.length,
    preUseOnly: compareLevels(preUseResponses),
  }
}

export interface FeedbackComment {
  id: string
  createdAt: string
  kind: "suggestion" | "difficulty"
  text: string
}

// Textos livres: sugestões (pergunta 7) e dificuldades do tipo "Outra".
export function collectComments(responses: FeedbackResponse[]): FeedbackComment[] {
  const comments: FeedbackComment[] = []

  for (const response of responses) {
    if (response.suggestions?.trim()) {
      comments.push({
        id: `${response.id}-s`,
        createdAt: response.created_at,
        kind: "suggestion",
        text: response.suggestions.trim(),
      })
    }

    if (response.main_difficulty_other?.trim()) {
      comments.push({
        id: `${response.id}-d`,
        createdAt: response.created_at,
        kind: "difficulty",
        text: response.main_difficulty_other.trim(),
      })
    }
  }

  return comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// Exportação CSV ---------------------------------------------------------------

// Ponto e vírgula e BOM: o Excel em português abre o arquivo com acentos e
// colunas corretos.
export function feedbackToCsv(responses: FeedbackResponse[]): string {
  const rows = responses.map((response) => ({
    "Data de envio": response.created_at,
    [FEEDBACK_QUESTIONS.knowledge_level.label]: optionLabel(
      FEEDBACK_QUESTIONS.knowledge_level.options,
      response.knowledge_level
    ),
    [FEEDBACK_QUESTIONS.ease_of_use.label]: optionLabel(
      FEEDBACK_QUESTIONS.ease_of_use.options,
      response.ease_of_use
    ),
    [FEEDBACK_QUESTIONS.indicators_understood.label]: optionLabel(
      FEEDBACK_QUESTIONS.indicators_understood.options,
      response.indicators_understood
    ),
    [FEEDBACK_QUESTIONS.ai_helpfulness.label]: optionLabel(
      FEEDBACK_QUESTIONS.ai_helpfulness.options,
      response.ai_helpfulness
    ),
    [FEEDBACK_QUESTIONS.decision_ready.label]: optionLabel(
      FEEDBACK_QUESTIONS.decision_ready.options,
      response.decision_ready
    ),
    [FEEDBACK_QUESTIONS.main_difficulty.label]: optionLabel(
      FEEDBACK_QUESTIONS.main_difficulty.options,
      response.main_difficulty
    ),
    "Outra dificuldade (explicação)": response.main_difficulty_other ?? "",
    "O que mudaria ou acrescentaria": response.suggestions ?? "",
    "ROAS antes do uso": optionLabel(ROAS_OPTIONS, response.roas_before),
    "ROAS depois do uso": optionLabel(ROAS_OPTIONS, response.roas_after),
    "Resposta 'antes' coletada": response.roas_before_source === "pre_use"
      ? "Antes de usar a plataforma"
      : "No formulário final (retrospectiva)",
  }))

  return `\ufeff${Papa.unparse(rows, { delimiter: ";" })}`
}
