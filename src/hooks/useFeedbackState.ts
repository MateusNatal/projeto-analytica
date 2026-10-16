import { useCallback, useState } from "react"

import type { RoasLevel } from "../utils/feedbackOptions"
import {
  dismissPreUse,
  markFeedbackSubmitted,
  readFeedbackState,
  savePreUseAnswer,
  type FeedbackLocalState,
} from "../services/feedbackStorage"

// Estado da avaliação no navegador, compartilhado entre a pergunta do
// primeiro acesso e o questionário do botão Feedback.
export function useFeedbackState() {
  const [state, setState] = useState<FeedbackLocalState>(readFeedbackState)

  const answerPreUse = useCallback((level: RoasLevel) => {
    setState(savePreUseAnswer(level))
  }, [])

  const skipPreUse = useCallback(() => {
    setState(dismissPreUse())
  }, [])

  const markSubmitted = useCallback(() => {
    setState(markFeedbackSubmitted())
  }, [])

  return { state, answerPreUse, skipPreUse, markSubmitted }
}

export type FeedbackStateApi = ReturnType<typeof useFeedbackState>
