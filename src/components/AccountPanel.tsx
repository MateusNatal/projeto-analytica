import { useState, type FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"

import { supabase } from "../services/supabaseClient"

import { Alert, Button, IconTile, Skeleton } from "./ui/primitives"

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
      <section className="panel account" aria-label="Conta">
        <Skeleton lines={2} label="Verificando login…" />
      </section>
    )
  }

  if (session) {
    return (
      <section className="panel account" aria-label="Conta">
        <div className="account-row">
          <div className="account-user">
            <IconTile name="user" size="sm" />
            <div>
              <span className="muted small">Conectado como</span>
              <strong>{session.user.email}</strong>
            </div>
          </div>

          <Button size="sm" variant="ghost" icon="logout" onClick={handleSignOut}>
            Sair
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="panel account" aria-labelledby="account-title">
      <div className="section-title">
        <IconTile name="user" />
        <div>
          <h2 id="account-title">Entrar</h2>
          <p className="muted small">
            Opcional. Com login, você salva os arquivos importados e usa a
            análise com IA. Enviamos um link de acesso, sem senha.
          </p>
        </div>
      </div>

      {status.kind === "sent" ? (
        <Alert tone="success">
          Enviamos um link para <strong>{status.email}</strong>. Abra o e-mail
          neste navegador para entrar.
        </Alert>
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

          <Button
            type="submit"
            variant="primary"
            icon="mail"
            loading={status.kind === "sending"}
          >
            {status.kind === "sending" ? "Enviando…" : "Enviar link de acesso"}
          </Button>
        </form>
      )}

      {status.kind === "error" && <Alert tone="error">{status.message}</Alert>}
    </section>
  )
}

export default AccountPanel
