import type { RoasLevel } from "../utils/feedbackOptions"
import type { PreUseAnswer } from "../utils/feedback"

// Guarda no navegador o que a avaliação precisa entre o primeiro acesso e o
// envio final: um identificador aleatório (não identifica a pessoa), a
// resposta sobre ROAS dada antes de usar a plataforma e se a avaliação já
// foi enviada.

const STORAGE_KEY = "analytica-feedback"

export interface FeedbackLocalState {
  respondentId: string
  preUse: PreUseAnswer | null
  preUseDismissed: boolean
  submitted: boolean
}

// Se o armazenamento estiver bloqueado (ex.: navegação privada), o estado
// vale só enquanto a página estiver aberta.
let memoryState: FeedbackLocalState | null = null

function newState(): FeedbackLocalState {
  return {
    respondentId: crypto.randomUUID(),
    preUse: null,
    preUseDismissed: false,
    submitted: false,
  }
}

function isState(value: unknown): value is FeedbackLocalState {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const state = value as Record<string, unknown>

  return (
    typeof state.respondentId === "string" &&
    typeof state.submitted === "boolean" &&
    typeof state.preUseDismissed === "boolean"
  )
}

export function readFeedbackState(): FeedbackLocalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null

    if (isState(parsed)) {
      return parsed
    }
  } catch {
    // Sem acesso ao armazenamento: usa a memória.
  }

  if (!memoryState) {
    memoryState = newState()
    writeFeedbackState(memoryState)
  }

  return memoryState
}

export function writeFeedbackState(state: FeedbackLocalState) {
  memoryState = state

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Mantém só em memória.
  }
}

export function savePreUseAnswer(level: RoasLevel): FeedbackLocalState {
  const state = {
    ...readFeedbackState(),
    preUse: { level, answeredAt: new Date().toISOString() },
  }

  writeFeedbackState(state)
  return state
}

export function dismissPreUse(): FeedbackLocalState {
  const state = { ...readFeedbackState(), preUseDismissed: true }
  writeFeedbackState(state)
  return state
}

export function markFeedbackSubmitted(): FeedbackLocalState {
  const state = { ...readFeedbackState(), submitted: true }
  writeFeedbackState(state)
  return state
}
