import type { Insight, InsightLevel } from "../utils/insights"

interface RuleInsightsProps {
  insights: Insight[]
}

// O nível é sempre comunicado por ícone e texto, nunca só pela cor.
const LEVEL_META: Record<InsightLevel, { icon: string; label: string }> = {
  critical: { icon: "!", label: "Atenção" },
  warning: { icon: "▲", label: "Pode melhorar" },
  positive: { icon: "✓", label: "Destaque" },
  info: { icon: "i", label: "Resumo" },
}

function RuleInsights({ insights }: RuleInsightsProps) {
  return (
    <section className="panel">
      <h2>O que os dados mostram</h2>

      <p className="muted small">
        Observações automáticas a partir de regras simples. Use como ponto de
        partida, não como decisão final.
      </p>

      {insights.length === 0 ? (
        <p className="empty-state">
          Nenhuma observação para as campanhas selecionadas.
        </p>
      ) : (
        <ul className="insight-list">
          {insights.map((insight) => {
            const meta = LEVEL_META[insight.level]

            return (
              <li
                key={insight.id}
                className={`insight insight-${insight.level}`}
              >
                <span className="insight-icon" aria-hidden="true">
                  {meta.icon}
                </span>

                <div>
                  <p className="insight-label">{meta.label}</p>
                  <h3>{insight.title}</h3>
                  <p>{insight.message}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default RuleInsights
