import type { CSSProperties } from "react"

import type { FeedbackOption } from "../../utils/feedbackOptions"

import Icon from "../ui/Icon"

// Opções com textos longos pedem colunas mais largas (ver .choice-list-long).
const LONG_LABEL = 24

interface ChoiceFieldProps {
  name: string
  number?: number
  question: string
  hint?: string
  options: readonly FeedbackOption[]
  value: string
  error?: string
  onChange: (value: string) => void
}

// Pergunta de múltipla escolha com botões de rádio nativos (acessíveis por
// teclado e leitores de tela), estilizados como cartões.
function ChoiceField({
  name,
  number,
  question,
  hint,
  options,
  value,
  error,
  onChange,
}: ChoiceFieldProps) {
  const errorId = `${name}-error`
  const hintId = `${name}-hint`

  return (
    <fieldset
      className={error ? "choice-group choice-group-invalid" : "choice-group"}
      id={`campo-${name}`}
      aria-describedby={[hint ? hintId : "", error ? errorId : ""].join(" ").trim() || undefined}
    >
      <legend>
        {number !== undefined && <span className="question-number">{number}</span>}
        {question}
      </legend>

      {hint && (
        <p className="muted small" id={hintId}>
          {hint}
        </p>
      )}

      <div
        className={
          options.some((option) => option.label.length > LONG_LABEL)
            ? "choice-list choice-list-long"
            : "choice-list"
        }
        style={{ "--choice-count": options.length } as CSSProperties}
      >
        {options.map((option) => (
          <label key={option.value} className="choice">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      {error && (
        <p className="field-error" id={errorId}>
          <Icon name="alertCircle" />
          {error}
        </p>
      )}
    </fieldset>
  )
}

export default ChoiceField
