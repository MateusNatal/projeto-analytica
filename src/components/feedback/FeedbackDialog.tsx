import { useEffect, useRef, useState, type MouseEvent } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { FeedbackLocalState } from "../../services/feedbackStorage"

import Icon from "../ui/Icon"

import FeedbackForm from "./FeedbackForm"

interface FeedbackDialogProps {
  client: SupabaseClient | null
  localState: FeedbackLocalState
  onSubmitted: () => void
  isAdmin: boolean
}

// Botão flutuante "Feedback" que abre o questionário numa janela.
// Usa o <dialog> nativo: mantém o foco dentro da janela, fecha com Esc e
// devolve o foco ao botão ao fechar.
function FeedbackDialog({ client, localState, onSubmitted, isAdmin }: FeedbackDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  // O formulário só é montado na primeira abertura e continua montado
  // depois, para não perder as respostas se a janela for fechada sem querer.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  function openDialog() {
    setMounted(true)
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
  }

  // Clique no fundo escurecido (fora da caixa) fecha a janela.
  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeDialog()
    }
  }

  return (
    <>
      <button
        type="button"
        className="feedback-fab"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Icon name="message" />
        Feedback
      </button>

      <dialog
        ref={dialogRef}
        className="feedback-dialog"
        aria-labelledby="feedback-title"
        onClose={() => setOpen(false)}
        onClick={handleBackdropClick}
      >
        <div className="feedback-dialog-frame">
          {mounted && (
            <FeedbackForm
              client={client}
              localState={localState}
              onSubmitted={onSubmitted}
              isAdmin={isAdmin}
              onClose={closeDialog}
            />
          )}
        </div>
      </dialog>
    </>
  )
}

export default FeedbackDialog
