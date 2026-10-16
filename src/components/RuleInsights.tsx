import type { Insight, InsightLevel } from "../utils/insights"

import { Badge, EmptyState, IconTile, type BadgeTone } from "./ui/primitives"

interface RuleInsightsProps {
  insights: Insight[]
}

// O nível é sempre comunicado por ícone e texto, nunca só pela cor.
const LEVEL_META: Record<InsightLevel, { tone: BadgeTone; label: string }> = {
  critical: { tone: "critical", label: "Atenção" },
  warning: { tone: "warning", label: "Pode melhorar" },
  positive: { tone: "positive", label: "Destaque" },
  info: { tone: "info", label: "Resumo" },
}

function RuleInsights({ insights }: RuleInsightsProps) {
  return (
    <section className="panel">
      <div className="section-title">
        <IconTile name="lightbulb" />
        <div>
          <h2>O que os dados mostram</h2>
          <p className="muted small">
            Observações automáticas a partir de regras simples. Use como ponto
            de partida, não como decisão final.
          </p>
        </div>
      </div>

      {insights.length === 0 ? (
        <EmptyState icon="lightbulb" title="Nenhuma observação por aqui">
          As campanhas selecionadas não têm investimento suficiente para gerar
          observações.
        </EmptyState>
      ) : (
        <ul className="insight-list">
          {insights.map((insight) => {
            const meta = LEVEL_META[insight.level]

            return (
              <li key={insight.id} className="insight">
                <Badge tone={meta.tone}>{meta.label}</Badge>
                <h3>{insight.title}</h3>
                <p>{insight.message}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default RuleInsights
