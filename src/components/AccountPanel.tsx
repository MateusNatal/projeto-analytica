import { useState, type FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"

import { supabase } from "../services/supabaseClient"

interface AccountPanelProps {
  session: Session | null
  loading: boolean
}

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string }

function AccountPanel({ session, loading }: AccountPanelProps) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  if (!supabase) {
    return null
  }

  const client = supabase

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const address = email.trim()

    if (!address) {
      return
    }

    setStatus({ kind: "sending" })

    const { error } = await client.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: window.location.origin },
    })

    if (error) {
      console.error("[auth] Falha ao enviar link:", error.message)
      setStatus({
        kind: "error",
        message:
          error.status === 429
            ? "Muitas tentativas. Aguarde alguns minutos e tente de novo."
            : "Não foi possível enviar o link. Confira o e-mail e tente de novo.",
      })
      return
    }

    setStatus({ kind: "sent", email: address })
  }

  async function handleSignOut() {
    await client.auth.signOut()
    setStatus({ kind: "idle" })
  }

  if (loading) {
    return (
      <section className="panel account">
        <p className="muted small">Verificando login…</p>
      </section>
    )
  }

  if (session) {
    return (
      <section className="panel account">
        <div className="panel-header">
          <p className="small">
            Conectado como <strong>{session.user.email}</strong>
          </p>

          <button type="button" className="button" onClick={handleSignOut}>
            Sair
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="panel account">
      <div>
        <h2>Entrar</h2>
        <p className="muted small">
          Opcional. Com login, você pode salvar os arquivos importados e
          consultá-los depois. Enviamos um link de acesso para o seu e-mail,
          sem senha.
        </p>
      </div>

      {status.kind === "sent" ? (
        <div className="alert alert-success" role="status">
          Enviamos um link para <strong>{status.email}</strong>. Abra o e-mail
          neste navegador para entrar.
        </div>
      ) : (
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
            />
          </label>

          <button
            type="submit"
            className="button button-primary"
            disabled={status.kind === "sending"}
          >
            {status.kind === "sending" ? "Enviando…" : "Enviar link de acesso"}
          </button>
        </form>
      )}

      {status.kind === "error" && (
        <div className="alert alert-error" role="alert">
          {status.message}
        </div>
      )}
    </section>
  )
}

export default AccountPanel
