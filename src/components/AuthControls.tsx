import { useEffect, useRef, useState, type FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"

import { supabase } from "../services/supabaseClient"

import Icon from "./ui/Icon"
import { Alert, Button } from "./ui/primitives"

interface AuthControlsProps {
  session: Session | null
  loading: boolean
  isAdmin: boolean
}

type Mode = "login" | "signup"

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string }

const COPY: Record<Mode, { title: string; description: string; action: string }> = {
  login: {
    title: "Entrar no Analytica",
    description:
      "Informe seu e-mail e enviaremos um link de acesso. Não é preciso senha.",
    action: "Enviar link de acesso",
  },
  signup: {
    title: "Criar sua conta",
    description:
      "Informe seu e-mail e enviaremos um link. Ao abrir o link, sua conta é criada e você já entra, sem precisar de senha.",
    action: "Criar conta e enviar link",
  },
}

// Login e cadastro no topo do site. O Supabase usa o mesmo fluxo (link
// mágico por e-mail) para os dois: no primeiro acesso, a conta é criada.
function AuthControls({ session, loading, isAdmin }: AuthControlsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) return

    if (mode && !dialog.open) dialog.showModal()
    if (!mode && dialog.open) dialog.close()
  }, [mode])

  // Fecha o menu da conta ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!menuOpen) return

    function handlePointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false)
    }

    document.addEventListener("pointerdown", handlePointer)
    document.addEventListener("keydown", handleKey)

    return () => {
      document.removeEventListener("pointerdown", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [menuOpen])

  if (!supabase) {
    return null
  }

  const client = supabase

  function openDialog(next: Mode) {
    setStatus({ kind: "idle" })
    setMode(next)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const address = email.trim()

    if (!address) return

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
            ? "Muitas tentativas. O serviço de e-mail limita os envios por hora; aguarde alguns minutos e tente de novo."
            : "Não foi possível enviar o link. Confira o e-mail e tente de novo.",
      })
      return
    }

    setStatus({ kind: "sent", email: address })
  }

  async function handleSignOut() {
    setMenuOpen(false)
    await client.auth.signOut()
  }

  if (loading) {
    return <span className="auth-loading skeleton-line" aria-label="Verificando login" />
  }

  if (session) {
    const userEmail = session.user.email ?? "Conta"

    return (
      <div className="account-menu" ref={menuRef}>
        <button
          type="button"
          className="account-trigger"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="account-avatar" aria-hidden="true">
            {userEmail.slice(0, 1).toUpperCase()}
          </span>
          <span className="account-trigger-email">{userEmail}</span>
          <Icon name="chevronDown" />
        </button>

        {menuOpen && (
          <div className="account-dropdown" role="menu">
            <div className="account-dropdown-header">
              <span className="muted small">Conectado como</span>
              <strong>{userEmail}</strong>
              {isAdmin && <span className="badge badge-info">Administrador</span>}
            </div>

            <a role="menuitem" href="#salvos" onClick={() => setMenuOpen(false)}>
              <Icon name="folder" />
              Meus arquivos salvos
            </a>
            <a role="menuitem" href="#analise-ia" onClick={() => setMenuOpen(false)}>
              <Icon name="sparkles" />
              Análise com IA
            </a>
            {isAdmin && (
              <a role="menuitem" href="#admin" onClick={() => setMenuOpen(false)}>
                <Icon name="shield" />
                Painel de avaliações
              </a>
            )}
            <button type="button" role="menuitem" onClick={handleSignOut}>
              <Icon name="logout" />
              Sair
            </button>
          </div>
        )}
      </div>
    )
  }

  const copy = mode ? COPY[mode] : COPY.login

  return (
    <div className="auth-buttons">
      <Button size="sm" variant="ghost" icon="login" onClick={() => openDialog("login")}>
        Entrar
      </Button>
      <Button size="sm" variant="primary" icon="userPlus" onClick={() => openDialog("signup")}>
        Criar conta
      </Button>

      <dialog
        ref={dialogRef}
        className="auth-dialog"
        aria-labelledby="auth-title"
        onClose={() => setMode(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMode(null)
        }}
      >
        <div className="auth-dialog-content">
          <div className="auth-dialog-header">
            <h2 id="auth-title">{copy.title}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Fechar"
              onClick={() => setMode(null)}
            >
              <Icon name="close" />
            </button>
          </div>

          <p className="muted small">{copy.description}</p>

          {status.kind === "sent" ? (
            <Alert tone="success">
              Enviamos um link para <strong>{status.email}</strong>. Abra o
              e-mail neste navegador para entrar. Ele pode levar alguns minutos
              e às vezes cai no spam.
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
                {status.kind === "sending" ? "Enviando…" : copy.action}
              </Button>
            </form>
          )}

          {status.kind === "error" && <Alert tone="error">{status.message}</Alert>}

          <p className="muted small">
            Com login, você pode salvar arquivos importados e usar a análise
            com IA. Sem login, tudo continua funcionando no seu navegador, sem
            salvar nada.
          </p>

          {mode === "login" ? (
            <p className="small">
              Primeiro acesso?{" "}
              <button type="button" className="link-button" onClick={() => openDialog("signup")}>
                Criar conta
              </button>
            </p>
          ) : (
            <p className="small">
              Já tem conta?{" "}
              <button type="button" className="link-button" onClick={() => openDialog("login")}>
                Entrar
              </button>
            </p>
          )}
        </div>
      </dialog>
    </div>
  )
}

export default AuthControls
