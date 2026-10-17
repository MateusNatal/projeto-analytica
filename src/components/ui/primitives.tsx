import type { ButtonHTMLAttributes, ReactNode } from "react"

import Icon, { type IconName } from "./Icon"

// Botão ---------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: "md" | "sm"
  icon?: IconName
  loading?: boolean
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "button button-primary",
  secondary: "button",
  ghost: "button button-ghost",
  danger: "button button-danger",
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  loading = false,
  disabled,
  children,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [
    VARIANT_CLASS[variant],
    size === "sm" ? "button-sm" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        icon && <Icon name={icon} />
      )}
      {children}
    </button>
  )
}

// Ícone com fundo em gradiente ---------------------------------------------

export function IconTile({
  name,
  size = "md",
  color,
}: {
  name: IconName
  size?: "md" | "sm"
  // Cor sólida da métrica (variável CSS). Sem ela, usa o gradiente da marca.
  color?: string
}) {
  return (
    <span
      className={size === "sm" ? "icon-tile icon-tile-sm" : "icon-tile"}
      style={color ? { background: color, boxShadow: "none" } : undefined}
    >
      <Icon name={name} />
    </span>
  )
}

// Selo de status (cor + ícone + texto) --------------------------------------

export type BadgeTone = "critical" | "warning" | "positive" | "info"

const BADGE_ICON: Record<BadgeTone, IconName> = {
  critical: "alert",
  warning: "alertCircle",
  positive: "check",
  info: "info",
}

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot">
        <Icon name={BADGE_ICON[tone]} />
      </span>
      {children}
    </span>
  )
}

// Aviso dentro de um painel -------------------------------------------------

export function Alert({
  tone,
  children,
}: {
  tone: "error" | "success"
  children: ReactNode
}) {
  return (
    <div
      className={`alert alert-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon name={tone === "error" ? "alertCircle" : "checkCircle"} />
      <div className="alert-content">{children}</div>
    </div>
  )
}

// Estado vazio --------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: IconName
  title: string
  children?: ReactNode
}) {
  return (
    <div className="empty-state">
      <IconTile name={icon} />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  )
}

// Carregamento --------------------------------------------------------------

export function Skeleton({
  lines = 3,
  block = false,
  label = "Carregando…",
}: {
  lines?: number
  block?: boolean
  label?: string
}) {
  return (
    <div className="skeleton" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {block && <div className="skeleton-line skeleton-block" />}
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="skeleton-line"
          style={{ width: `${100 - index * 18}%` }}
        />
      ))}
    </div>
  )
}

// Barra de progresso --------------------------------------------------------

export function ProgressBar({
  label,
  value,
  valueLabel,
}: {
  label: string
  value: number
  valueLabel: string
}) {
  const percent = Math.max(0, Math.min(100, value))

  return (
    <div className="progress">
      <div className="progress-label">
        <span>{label}</span>
        <strong className="tabular">{valueLabel}</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
