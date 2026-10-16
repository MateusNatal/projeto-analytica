import { useRef, useState, type FormEvent } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"

import {
  CHOICE_QUESTIONS,
  FEEDBACK_QUESTIONS,
  MAX_OTHER_LENGTH,
  MAX_SUGGESTIONS_LENGTH,
  ROAS_OPTIONS,
  ROAS_QUESTION,
  SUGGESTIONS_QUESTION,
  optionLabel,
  type ChoiceQuestion,
} from "../../utils/feedbackOptions"
import {
  emptyFeedbackForm,
  validateFeedback,
  type FeedbackErrors,
  type FeedbackField,
} from "../../utils/feedback"
import { FeedbackServiceError, submitFeedback } from "../../services/feedbackService"
import type { FeedbackLocalState } from "../../services/feedbackStorage"

import Icon from "../ui/Icon"
import { Alert, Button, EmptyState, IconTile } from "../ui/primitives"
import { useToast } from "../ui/toastContext"

import ChoiceField from "./ChoiceField"

interface FeedbackFormProps {
  client: SupabaseClient | null
  localState: FeedbackLocalState
  onSubmitted: () => void
  isAdmin: boolean
}

// Ordem dos campos na tela, para levar o foco ao primeiro erro.
const FIELD_ORDER: FeedbackField[] = [
  "roasBefore",
  ...CHOICE_QUESTIONS.slice(0, 5),
  "main_difficulty",
  "otherDifficulty",
  "suggestions",
  "roasAfter",
]

function FeedbackForm({ client, localState, onSubmitted, isAdmin }: FeedbackFormProps) {
  const toast = useToast()
  const [values, setValues] = useState(emptyFeedbackForm)
  const [errors, setErrors] = useState<FeedbackErrors>({})
  const [sending, setSending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Campo invisível para pessoas; robôs que preenchem tudo são ignorados.
  const [website, setWebsite] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  const header = (
    <div className="section-title">
      <IconTile name="message" />
      <div>
        <h2 id="feedback-title">Avalie o Analytica</h2>
        <p className="muted small">
          Leva cerca de 2 minutos. A avaliação é anônima: não pedimos nome,
          e-mail nem outros dados pessoais.
        </p>
      </div>
    </div>
  )

  if (!client) {
    return (
      <section className="panel" aria-labelledby="feedback-title">
        {header}
        <EmptyState icon="message" title="Envio indisponível no momento">
          O envio de avaliações fica disponível quando o banco de dados estiver
          configurado.
        </EmptyState>
      </section>
    )
  }

  if (localState.submitted) {
    return (
      <section className="panel" aria-labelledby="feedback-title">
        {header}
        <EmptyState icon="checkCircle" title="Obrigado pela sua avaliação!">
          Sua resposta foi registrada e vai ajudar a melhorar o Analytica.
        </EmptyState>
        {isAdmin && <AdminLink />}
      </section>
    )
  }

  const supabase = client
  const preUse = localState.preUse
  const answered =
    CHOICE_QUESTIONS.filter((question) => values.choices[question]).length +
    (preUse || values.roasBefore ? 1 : 0) +
    (values.roasAfter ? 1 : 0)
  const totalQuestions = CHOICE_QUESTIONS.length + 2

  function setChoice(question: ChoiceQuestion, value: string) {
    setValues((current) => ({
      ...current,
      choices: { ...current.choices, [question]: value },
    }))
    setErrors((current) => ({ ...current, [question]: undefined }))
  }

  function setField(field: "roasBefore" | "roasAfter" | "otherDifficulty" | "suggestions", value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function focusFirstError(found: FeedbackErrors) {
    const first = FIELD_ORDER.find((field) => found[field])

    if (!first) {
      return
    }

    const field = formRef.current?.querySelector<HTMLElement>(`#campo-${first}`)
    const target =
      field?.querySelector<HTMLElement>("input, textarea") ?? field

    target?.focus({ preventScroll: true })
    field?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    const result = validateFeedback(values, preUse, localState.respondentId)

    if (!result.ok) {
      setErrors(result.errors)
      focusFirstError(result.errors)
      return
    }

    // Robôs costumam preencher campos ocultos: finge sucesso sem gravar nada.
    if (website) {
      onSubmitted()
      return
    }

    setSending(true)

    try {
      await submitFeedback(supabase, result.submission)
      toast.show("Avaliação enviada. Obrigado por participar!")
      onSubmitted()
    } catch (caught) {
      if (caught instanceof FeedbackServiceError && caught.kind === "already_sent") {
        toast.show(caught.message)
        onSubmitted()
        return
      }

      const message =
        caught instanceof FeedbackServiceError
          ? caught.message
          : "Não foi possível enviar a avaliação. Tente novamente."

      setSubmitError(message)
      toast.show(message, "error")
    } finally {
      setSending(false)
    }
  }

  const errorCount = Object.values(errors).filter(Boolean).length

  return (
    <section className="panel" aria-labelledby="feedback-title">
      <div className="panel-header">
        {header}
        <span className="source-chip tabular" aria-live="polite">
          {answered} de {totalQuestions} respondidas
        </span>
      </div>

      {isAdmin && <AdminLink />}

      <form ref={formRef} className="feedback-form" onSubmit={handleSubmit} noValidate>
        {errorCount > 0 && (
          <Alert tone="error">
            {errorCount === 1
              ? "Falta responder 1 pergunta obrigatória."
              : `Faltam ${errorCount} respostas obrigatórias.`}{" "}
            Os campos estão destacados abaixo.
          </Alert>
        )}

        <div className="feedback-step">
          <p className="feedback-step-title">Antes de usar o Analytica</p>

          {preUse ? (
            <div className="feedback-note" id="campo-roasBefore">
              <Icon name="checkCircle" />
              <div>
                <strong>{ROAS_QUESTION}</strong>
                <p className="muted small">
                  Sua resposta no primeiro acesso:{" "}
                  <strong>{optionLabel(ROAS_OPTIONS, preUse.level)}</strong>
                </p>
              </div>
            </div>
          ) : (
            <ChoiceField
              name="roasBefore"
              question={ROAS_QUESTION}
              hint="Pense em como era antes de usar a plataforma."
              options={ROAS_OPTIONS}
              value={values.roasBefore}
              error={errors.roasBefore}
              onChange={(value) => setField("roasBefore", value)}
            />
          )}
        </div>

        <div className="feedback-step">
          <p className="feedback-step-title">Sobre a sua experiência</p>

          {CHOICE_QUESTIONS.map((question, index) => (
            <div key={question} className="feedback-question">
              <ChoiceField
                name={question}
                number={index + 1}
                question={FEEDBACK_QUESTIONS[question].label}
                options={FEEDBACK_QUESTIONS[question].options}
                value={values.choices[question]}
                error={errors[question]}
                onChange={(value) => setChoice(question, value)}
              />

              {question === "main_difficulty" && values.choices.main_difficulty === "other" && (
                <label className="field feedback-textarea" id="campo-otherDifficulty">
                  Conte qual foi a dificuldade
                  <textarea
                    value={values.otherDifficulty}
                    maxLength={MAX_OTHER_LENGTH}
                    rows={3}
                    aria-invalid={Boolean(errors.otherDifficulty) || undefined}
                    onChange={(event) => setField("otherDifficulty", event.target.value)}
                  />
                  <span className="field-meta">
                    {errors.otherDifficulty ? (
                      <span className="field-error">
                        <Icon name="alertCircle" />
                        {errors.otherDifficulty}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="tabular">
                      {values.otherDifficulty.length}/{MAX_OTHER_LENGTH}
                    </span>
                  </span>
                </label>
              )}
            </div>
          ))}

          <label className="field feedback-textarea" id="campo-suggestions">
            <span>
              <span className="question-number">{CHOICE_QUESTIONS.length + 1}</span>
              {SUGGESTIONS_QUESTION} <span className="muted">(opcional)</span>
            </span>
            <textarea
              value={values.suggestions}
              maxLength={MAX_SUGGESTIONS_LENGTH}
              rows={4}
              placeholder="Escreva sua sugestão. Evite incluir dados pessoais."
              onChange={(event) => setField("suggestions", event.target.value)}
            />
            <span className="field-meta">
              {errors.suggestions ? (
                <span className="field-error">
                  <Icon name="alertCircle" />
                  {errors.suggestions}
                </span>
              ) : (
                <span />
              )}
              <span className="tabular">
                {values.suggestions.length}/{MAX_SUGGESTIONS_LENGTH}
              </span>
            </span>
          </label>
        </div>

        <div className="feedback-step">
          <p className="feedback-step-title">Depois de usar o Analytica</p>

          <ChoiceField
            name="roasAfter"
            question={ROAS_QUESTION}
            hint="Agora, depois de usar a plataforma."
            options={ROAS_OPTIONS}
            value={values.roasAfter}
            error={errors.roasAfter}
            onChange={(value) => setField("roasAfter", value)}
          />
        </div>

        <div className="honeypot" aria-hidden="true">
          <label>
            Site
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </label>
        </div>

        {submitError && <Alert tone="error">{submitError}</Alert>}

        <div className="feedback-actions">
          <Button type="submit" variant="primary" icon="send" loading={sending}>
            {sending ? "Enviando…" : "Enviar avaliação"}
          </Button>
          <p className="muted small">
            Ao enviar, as respostas são gravadas de forma anônima e só a equipe
            do Analytica tem acesso.
          </p>
        </div>
      </form>
    </section>
  )
}

function AdminLink() {
  return (
    <a className="sample-link admin-link" href="#admin">
      <Icon name="shield" />
      Ver painel de avaliações (administrador)
    </a>
  )
}

export default FeedbackForm
