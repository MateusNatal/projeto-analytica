import { useCallback, useMemo, useRef, useState, type ReactNode } from "react"

import Icon from "./Icon"
import { ToastContext, type ToastKind } from "./toastContext"

interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

const TOAST_DURATION_MS = 4500

// Mostra avisos temporários (ex.: "Arquivo salvo") num canto da tela, numa
// região anunciada por leitores de tela.
function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-2), { id, message, kind }])
      window.setTimeout(() => dismiss(id), TOAST_DURATION_MS)
    },
    [dismiss]
  )

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.kind}`}
            role={toast.kind === "error" ? "alert" : "status"}
          >
            <Icon name={toast.kind === "error" ? "alertCircle" : "checkCircle"} />
            <span>{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Fechar aviso"
              onClick={() => dismiss(toast.id)}
            >
              <Icon name="close" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
