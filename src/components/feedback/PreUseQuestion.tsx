import type { CSSProperties } from "react"

import { ROAS_OPTIONS, ROAS_QUESTION, type RoasLevel } from "../../utils/feedbackOptions"

import { Button, IconTile } from "../ui/primitives"
import { useToast } from "../ui/toastContext"

interface PreUseQuestionProps {
  onAnswer: (level: RoasLevel) => void
  onSkip: () => void
}

// Pergunta feita no primeiro acesso, antes de a pessoa usar a plataforma,
// para comparar com a mesma pergunta respondida no final, no botão Feedback.
function PreUseQuestion({ onAnswer, onSkip }: PreUseQuestionProps) {
  const toast = useToast()

  function handleAnswer(level: RoasLevel) {
    onAnswer(level)
    toast.show(
      "Resposta registrada. Depois de explorar o painel, conte como foi no botão Feedback, no canto da tela."
    )
  }

  return (
    <section className="panel pre-use" aria-labelledby="pre-use-title">
      <div className="section-title">
        <IconTile name="lightbulb" />
        <div>
          <h2 id="pre-use-title">Antes de começar, uma pergunta rápida</h2>
          <p className="muted small">
            Opcional e anônima. Ela ajuda a medir se o Analytica facilita o
            entendimento das métricas. A resposta fica neste navegador até você
            enviar a avaliação pelo botão Feedback, no canto da tela.
          </p>
        </div>
      </div>

      <fieldset className="choice-group">
        <legend>{ROAS_QUESTION}</legend>

        <div
          className="choice-list choice-list-long"
          style={{ "--choice-count": ROAS_OPTIONS.length } as CSSProperties}
        >
          {ROAS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              className="choice-button"
              onClick={() => handleAnswer(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </fieldset>

      <div>
        <Button size="sm" variant="ghost" onClick={onSkip}>
          Agora não
        </Button>
      </div>
    </section>
  )
}

export default PreUseQuestion
