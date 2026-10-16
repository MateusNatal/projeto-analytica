import type { SupabaseClient } from "@supabase/supabase-js"

import type { FeedbackResponse, FeedbackSubmission } from "../utils/feedback"

export const MAX_FEEDBACK_ROWS = 5000

export type FeedbackErrorKind = "already_sent" | "rate_limited" | "generic"

export class FeedbackServiceError extends Error {
  readonly kind: FeedbackErrorKind

  constructor(kind: FeedbackErrorKind, message: string) {
    super(message)
    this.name = "FeedbackServiceError"
    this.kind = kind
  }
}

interface PostgrestLikeError {
  code?: string
  message: string
}

function toServiceError(action: string, error: PostgrestLikeError): FeedbackServiceError {
  // A mensagem técnica fica no console; quem usa vê uma explicação simples.
  console.error(`[feedback] Falha ao ${action}:`, error.code, error.message)

  if (error.code === "23505") {
    return new FeedbackServiceError(
      "already_sent",
      "Você já enviou uma avaliação deste navegador. Obrigado!"
    )
  }

  if (error.code === "P0001") {
    return new FeedbackServiceError(
      "rate_limited",
      "Muitas avaliações estão sendo enviadas agora. Tente novamente em alguns minutos."
    )
  }

  return new FeedbackServiceError(
    "generic",
    `Não foi possível ${action}. Verifique sua conexão e tente novamente.`
  )
}

// Envia a avaliação. Não pede o retorno da linha (o banco não deixa visitantes
// lerem as avaliações), então nada além do que foi enviado volta ao navegador.
export async function submitFeedback(
  client: SupabaseClient,
  submission: FeedbackSubmission
): Promise<void> {
  const { error } = await client.from("feedback_responses").insert(submission)

  if (error) {
    throw toServiceError("enviar a avaliação", error)
  }
}

export async function checkIsAdmin(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc("is_admin")

  if (error) {
    console.error("[feedback] Falha ao verificar administrador:", error.message)
    return false
  }

  return data === true
}

export async function listFeedback(
  client: SupabaseClient
): Promise<FeedbackResponse[]> {
  const { data, error } = await client
    .from("feedback_responses")
    .select(
      "id, created_at, respondent_id, knowledge_level, ease_of_use, indicators_understood, ai_helpfulness, decision_ready, main_difficulty, main_difficulty_other, suggestions, roas_before, roas_after, roas_before_source, roas_before_answered_at"
    )
    .order("created_at", { ascending: false })
    .limit(MAX_FEEDBACK_ROWS)

  if (error) {
    throw toServiceError("carregar as avaliações", error)
  }

  return data as FeedbackResponse[]
}
