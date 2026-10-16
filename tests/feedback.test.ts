import type { SupabaseClient } from "@supabase/supabase-js"
import Papa from "papaparse"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  collectComments,
  compareRoas,
  countChoice,
  emptyFeedbackForm,
  feedbackToCsv,
  validateFeedback,
  type FeedbackFormValues,
  type FeedbackResponse,
} from "../src/utils/feedback"
import { CHOICE_QUESTIONS, FEEDBACK_QUESTIONS } from "../src/utils/feedbackOptions"
import {
  checkIsAdmin,
  FeedbackServiceError,
  listFeedback,
  submitFeedback,
} from "../src/services/feedbackService"

// Todos os dados abaixo são fictícios e existem só para os testes.

const RESPONDENT = "11111111-2222-4333-8444-555555555555"

function filledForm(overrides: Partial<FeedbackFormValues> = {}): FeedbackFormValues {
  return {
    ...emptyFeedbackForm(),
    choices: {
      knowledge_level: "basic",
      ease_of_use: "easy",
      indicators_understood: "most",
      ai_helpfulness: "very",
      decision_ready: "yes",
      main_difficulty: "none",
    },
    roasBefore: "cannot",
    roasAfter: "can_explain",
    ...overrides,
  }
}

let counter = 0

function fakeResponse(overrides: Partial<FeedbackResponse> = {}): FeedbackResponse {
  counter++
  return {
    id: `resp-${counter}`,
    created_at: `2026-10-17T10:00:${String(counter % 60).padStart(2, "0")}Z`,
    respondent_id: `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`,
    knowledge_level: "basic",
    ease_of_use: "easy",
    indicators_understood: "most",
    ai_helpfulness: "very",
    decision_ready: "yes",
    main_difficulty: "none",
    main_difficulty_other: null,
    suggestions: null,
    roas_before: "cannot",
    roas_after: "can_explain",
    roas_before_source: "pre_use",
    roas_before_answered_at: "2026-10-17T09:00:00Z",
    ...overrides,
  }
}

describe("validateFeedback", () => {
  it("formulário vazio aponta todas as perguntas obrigatórias", () => {
    const result = validateFeedback(emptyFeedbackForm(), null, RESPONDENT)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        [...CHOICE_QUESTIONS, "roasAfter", "roasBefore"].sort()
      )
    }
  })

  it("monta o envio com a resposta do primeiro acesso", () => {
    const preUse = { level: "vague" as const, answeredAt: "2026-10-17T08:00:00.000Z" }
    const result = validateFeedback(filledForm({ roasBefore: "" }), preUse, RESPONDENT)

    expect(result).toEqual({
      ok: true,
      submission: {
        respondent_id: RESPONDENT,
        knowledge_level: "basic",
        ease_of_use: "easy",
        indicators_understood: "most",
        ai_helpfulness: "very",
        decision_ready: "yes",
        main_difficulty: "none",
        main_difficulty_other: null,
        suggestions: null,
        roas_before: "vague",
        roas_after: "can_explain",
        roas_before_source: "pre_use",
        roas_before_answered_at: "2026-10-17T08:00:00.000Z",
      },
    })
  })

  it("sem resposta do primeiro acesso, marca o 'antes' como retrospectivo", () => {
    const result = validateFeedback(filledForm(), null, RESPONDENT)

    expect(result.ok && result.submission.roas_before_source).toBe("retrospective")
    expect(result.ok && result.submission.roas_before_answered_at).toBeNull()
  })

  it("'Outra' exige a explicação, que é limpa de espaços", () => {
    const choices = { ...filledForm().choices, main_difficulty: "other" }

    const missing = validateFeedback(filledForm({ choices, otherDifficulty: "   " }), null, RESPONDENT)
    expect(!missing.ok && missing.errors.otherDifficulty).toBe("Conte qual foi a dificuldade.")

    const ok = validateFeedback(filledForm({ choices, otherDifficulty: "  Texto fictício  " }), null, RESPONDENT)
    expect(ok.ok && ok.submission.main_difficulty_other).toBe("Texto fictício")
  })

  it("descarta a explicação quando a opção não é 'Outra'", () => {
    const result = validateFeedback(filledForm({ otherDifficulty: "sobrou" }), null, RESPONDENT)

    expect(result.ok && result.submission.main_difficulty_other).toBeNull()
  })

  it("sugestão é opcional, mas tem limite de tamanho", () => {
    const empty = validateFeedback(filledForm({ suggestions: "  " }), null, RESPONDENT)
    expect(empty.ok && empty.submission.suggestions).toBeNull()

    const long = validateFeedback(filledForm({ suggestions: "a".repeat(2001) }), null, RESPONDENT)
    expect(!long.ok && long.errors.suggestions).toMatch(/2000/)
  })

  it("rejeita valores que não estão entre as opções", () => {
    const choices = { ...filledForm().choices, knowledge_level: "expert" }
    const result = validateFeedback(filledForm({ choices, roasAfter: "talvez" }), null, RESPONDENT)

    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(["knowledge_level", "roasAfter"])
  })
})

describe("estatísticas do painel", () => {
  it("conta cada opção com porcentagem, inclusive as sem resposta", () => {
    const responses = [
      fakeResponse({ ease_of_use: "easy" }),
      fakeResponse({ ease_of_use: "easy" }),
      fakeResponse({ ease_of_use: "very_hard" }),
      fakeResponse({ ease_of_use: "very_easy" }),
    ]

    const counts = countChoice(responses, "ease_of_use")

    expect(counts.map((item) => item.label)).toEqual(
      FEEDBACK_QUESTIONS.ease_of_use.options.map((option) => option.label)
    )
    expect(counts.map((item) => item.count)).toEqual([1, 0, 0, 2, 1])
    expect(counts.find((item) => item.value === "easy")?.percent).toBe(50)
  })

  it("lista vazia não divide por zero", () => {
    expect(countChoice([], "decision_ready").every((item) => item.percent === 0)).toBe(true)
  })

  it("compara o ROAS antes e depois", () => {
    const comparison = compareRoas([
      fakeResponse({ roas_before: "cannot", roas_after: "can_explain" }),
      fakeResponse({ roas_before: "vague", roas_after: "vague" }),
      fakeResponse({ roas_before: "can_explain", roas_after: "vague" }),
      fakeResponse({
        roas_before: "cannot",
        roas_after: "vague",
        roas_before_source: "retrospective",
        roas_before_answered_at: null,
      }),
    ])

    expect(comparison).toMatchObject({
      total: 4,
      improved: 2,
      same: 1,
      worse: 1,
      preUse: 3,
      retrospective: 1,
      preUseOnly: { total: 3, improved: 1, same: 1, worse: 1 },
    })
    expect(comparison.before.map((item) => item.count)).toEqual([2, 1, 1])
    expect(comparison.after.map((item) => item.count)).toEqual([0, 3, 1])
  })

  it("reúne sugestões e dificuldades 'Outra', das mais recentes para as antigas", () => {
    const comments = collectComments([
      fakeResponse({ created_at: "2026-10-17T10:00:00Z", suggestions: "Sugestão fictícia A" }),
      fakeResponse({
        created_at: "2026-10-17T12:00:00Z",
        main_difficulty: "other",
        main_difficulty_other: "Dificuldade fictícia",
        suggestions: "   ",
      }),
      fakeResponse({ created_at: "2026-10-17T11:00:00Z" }),
    ])

    expect(comments.map((comment) => [comment.kind, comment.text])).toEqual([
      ["difficulty", "Dificuldade fictícia"],
      ["suggestion", "Sugestão fictícia A"],
    ])
  })
})

describe("feedbackToCsv", () => {
  it("gera CSV com ponto e vírgula, BOM e textos das opções", () => {
    const csv = feedbackToCsv([
      fakeResponse({
        main_difficulty: "other",
        main_difficulty_other: 'Texto com ; ponto e vírgula e "aspas"',
        suggestions: "Linha 1\nLinha 2",
      }),
    ])

    expect(csv.charCodeAt(0)).toBe(0xfeff)

    const parsed = Papa.parse<Record<string, string>>(csv.slice(1), {
      header: true,
      delimiter: ";",
    })
    const [row] = parsed.data

    expect(parsed.errors).toEqual([])
    expect(row[FEEDBACK_QUESTIONS.knowledge_level.label]).toBe("Básico")
    expect(row[FEEDBACK_QUESTIONS.main_difficulty.label]).toBe("Outra")
    expect(row["Outra dificuldade (explicação)"]).toBe('Texto com ; ponto e vírgula e "aspas"')
    expect(row["O que mudaria ou acrescentaria"]).toBe("Linha 1\nLinha 2")
    expect(row["ROAS antes do uso"]).toBe("Não sei explicar.")
    expect(row["Resposta 'antes' coletada"]).toBe("Antes de usar a plataforma")
  })

  it("não exporta o identificador do navegador", () => {
    const response = fakeResponse()

    expect(feedbackToCsv([response])).not.toContain(response.respondent_id)
  })
})

describe("feedbackService", () => {
  function fakeClient(result: { data?: unknown; error: { code?: string; message: string } | null }) {
    const calls: { method: string; args: unknown[] }[] = []
    const builder: Record<string, unknown> = {}

    for (const method of ["select", "order", "limit"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ method, args })
        return builder
      }
    }

    builder.insert = async (...args: unknown[]) => {
      calls.push({ method: "insert", args })
      return result
    }
    builder.then = (resolve: (value: unknown) => unknown) => resolve(result)

    const client = {
      from: (table: string) => {
        calls.push({ method: "from", args: [table] })
        return builder
      },
      rpc: async (fn: string) => {
        calls.push({ method: "rpc", args: [fn] })
        return result
      },
    }

    return { client: client as unknown as SupabaseClient, calls }
  }

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("envia a avaliação sem pedir a linha de volta", async () => {
    const { client, calls } = fakeClient({ error: null })
    const submission = validateFeedback(filledForm(), null, RESPONDENT)

    if (!submission.ok) throw new Error("formulário de teste inválido")

    await submitFeedback(client, submission.submission)

    expect(calls[0]).toEqual({ method: "from", args: ["feedback_responses"] })
    expect(calls[1]).toEqual({ method: "insert", args: [submission.submission] })
    expect(calls.some((call) => call.method === "select")).toBe(false)
  })

  it.each([
    ["23505", "already_sent", /já enviou/],
    ["P0001", "rate_limited", /alguns minutos/],
    ["42501", "generic", /Não foi possível enviar/],
  ])("erro %s vira mensagem amigável (%s)", async (code, kind, message) => {
    const { client } = fakeClient({ error: { code, message: "detalhe técnico interno" } })

    const attempt = submitFeedback(client, {} as never)

    await expect(attempt).rejects.toBeInstanceOf(FeedbackServiceError)
    await expect(attempt).rejects.toMatchObject({ kind })
    await expect(attempt).rejects.toThrow(message)
    await expect(attempt).rejects.not.toThrow(/detalhe técnico/)
  })

  it("is_admin falso quando a chamada falha", async () => {
    const { client } = fakeClient({ data: null, error: { message: "sem permissão" } })

    expect(await checkIsAdmin(client)).toBe(false)
  })

  it("is_admin verdadeiro só com resposta true", async () => {
    expect(await checkIsAdmin(fakeClient({ data: true, error: null }).client)).toBe(true)
    expect(await checkIsAdmin(fakeClient({ data: "true", error: null }).client)).toBe(false)
  })

  it("lista as avaliações mais recentes primeiro", async () => {
    const { client, calls } = fakeClient({ data: [fakeResponse()], error: null })

    const list = await listFeedback(client)

    expect(list).toHaveLength(1)
    expect(calls).toContainEqual({
      method: "order",
      args: ["created_at", { ascending: false }],
    })
  })
})
