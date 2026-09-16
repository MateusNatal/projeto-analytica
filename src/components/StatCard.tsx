interface StatCardProps {
  title: string
  value: string
  description: string
}

function StatCard({
  title,
  value,
  description,
}: StatCardProps) {
  return (
    <div>
      <span>{title}</span>

      <strong>{value}</strong>

      <small>{description}</small>
    </div>
  )
}

export default StatCard