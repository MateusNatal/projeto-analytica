// Perguntas e opções da avaliação. Os códigos (value) são os mesmos aceitos
// pelas restrições da tabela feedback_responses no banco; os textos (label)
// são os mostrados no formulário, no painel e no CSV exportado.

export interface FeedbackOption<T extends string = string> {
  value: T
  label: string
}

function options<const T extends string>(
  list: readonly { value: T; label: string }[]
): FeedbackOption<T>[] {
  return [...list]
}

export const ROAS_OPTIONS = options([
  { value: "cannot", label: "Não sei explicar." },
  { value: "vague", label: "Tenho uma ideia, mas não sei explicar com segurança." },
  { value: "can_explain", label: "Consigo explicar com minhas próprias palavras." },
])

export const ROAS_QUESTION =
  "Você consegue explicar o que significa o ROAS em uma campanha de marketing digital?"

export const FEEDBACK_QUESTIONS = {
  knowledge_level: {
    label:
      "Qual era seu nível de conhecimento sobre análise de dados antes de usar o Analytica?",
    options: options([
      { value: "none", label: "Nenhum" },
      { value: "basic", label: "Básico" },
      { value: "intermediate", label: "Intermediário" },
      { value: "advanced", label: "Avançado" },
    ]),
  },
  ease_of_use: {
    label: "Foi fácil importar os dados e encontrar as informações desejadas?",
    options: options([
      { value: "very_hard", label: "Muito difícil" },
      { value: "hard", label: "Difícil" },
      { value: "neutral", label: "Nem fácil nem difícil" },
      { value: "easy", label: "Fácil" },
      { value: "very_easy", label: "Muito fácil" },
    ]),
  },
  indicators_understood: {
    label: "Você conseguiu compreender os indicadores apresentados?",
    options: options([
      { value: "none", label: "Nenhum" },
      { value: "few", label: "Poucos" },
      { value: "most", label: "A maioria" },
      { value: "all", label: "Todos" },
    ]),
  },
  ai_helpfulness: {
    label:
      "As explicações da inteligência artificial ajudaram você a entender os resultados?",
    options: options([
      { value: "not_helpful", label: "Não ajudaram" },
      { value: "slightly", label: "Ajudaram pouco" },
      { value: "moderately", label: "Ajudaram razoavelmente" },
      { value: "very", label: "Ajudaram muito" },
      { value: "not_used", label: "Não utilizei essa função" },
    ]),
  },
  decision_ready: {
    label: "Você conseguiria usar essas informações para tomar decisões no seu negócio?",
    options: options([
      { value: "no", label: "Não" },
      { value: "maybe_with_help", label: "Talvez, com ajuda" },
      { value: "yes", label: "Sim" },
    ]),
  },
  main_difficulty: {
    label: "Qual foi sua maior dificuldade durante o uso?",
    options: options([
      { value: "import", label: "Importação dos dados" },
      { value: "indicators", label: "Entendimento dos indicadores" },
      { value: "ai_analysis", label: "Interpretação da análise da IA" },
      { value: "navigation", label: "Navegação pelo site" },
      { value: "none", label: "Não encontrei dificuldades" },
      { value: "other", label: "Outra" },
    ]),
  },
} as const

export type ChoiceQuestion = keyof typeof FEEDBACK_QUESTIONS

export const CHOICE_QUESTIONS = Object.keys(FEEDBACK_QUESTIONS) as ChoiceQuestion[]

export const SUGGESTIONS_QUESTION =
  "O que você mudaria ou acrescentaria no Analytica?"

export const MAX_OTHER_LENGTH = 500
export const MAX_SUGGESTIONS_LENGTH = 2000

export type RoasLevel = (typeof ROAS_OPTIONS)[number]["value"]

export type ChoiceAnswer<Q extends ChoiceQuestion> =
  (typeof FEEDBACK_QUESTIONS)[Q]["options"][number]["value"]

export function optionLabel(
  list: readonly FeedbackOption[],
  value: string | null | undefined
): string {
  return list.find((option) => option.value === value)?.label ?? ""
}
