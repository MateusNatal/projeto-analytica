interface StatCardProps {
  title: string
  value: string
  description: string
  hint?: string
}

function StatCard({
  title,
  value,
  description,
  hint,
}: StatCardProps) {
  return (
    <div className="stat-card">
      <span className="stat-title">{title}</span>

      <strong className="stat-value">{value}</strong>

      <small className="stat-description">{description}</small>

      {hint && <small className="stat-hint">{hint}</small>}
    </div>
  )
}

export default StatCard
