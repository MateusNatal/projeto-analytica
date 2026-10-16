import type { IconName } from "./ui/Icon"
import { IconTile } from "./ui/primitives"

interface StatCardProps {
  title: string
  value: string
  description: string
  hint?: string
  icon?: IconName
}

function StatCard({
  title,
  value,
  description,
  hint,
  icon,
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        {icon && <IconTile name={icon} size="sm" />}
        <span className="stat-title">{title}</span>
      </div>

      <strong className="stat-value">{value}</strong>

      <small className="stat-description">{description}</small>

      {hint && <small className="stat-hint">{hint}</small>}
    </div>
  )
}

export default StatCard
