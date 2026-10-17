import type { IconName } from "./ui/Icon"
import { IconTile } from "./ui/primitives"

interface StatCardProps {
  title: string
  value: string
  description: string
  hint?: string
  icon?: IconName
  // Cor da métrica (variável CSS), igual à usada nos gráficos e legendas.
  color?: string
  // Métrica que o arquivo não traz: não é mostrada como zero.
  unavailable?: boolean
  compact?: boolean
}

function StatCard({
  title,
  value,
  description,
  hint,
  icon,
  color,
  unavailable = false,
  compact = false,
}: StatCardProps) {
  return (
    <div
      className={[
        "stat-card",
        compact ? "stat-card-compact" : "",
        unavailable ? "stat-card-unavailable" : "",
      ].join(" ").trim()}
      style={color ? { borderTopColor: color } : undefined}
    >
      <div className="stat-card-top">
        {icon && <IconTile name={icon} size="sm" color={color} />}
        <span className="stat-title">{title}</span>
      </div>

      <strong className="stat-value">{unavailable ? "—" : value}</strong>

      <small className="stat-description">
        {unavailable ? "Não disponível neste arquivo" : description}
      </small>

      {hint && !unavailable && !compact && <small className="stat-hint">{hint}</small>}
    </div>
  )
}

export default StatCard
