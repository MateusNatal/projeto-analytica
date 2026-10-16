import { useState } from "react"

import type { Campaign } from "../types/campaign"

import { calculateCampaignMetrics } from "../utils/metrics"
import { calculateTotalInvestment } from "../utils/dashboardMetrics"
import {
  formatCurrency,
  formatMultiplier,
  formatPercent,
} from "../utils/formatters"
import { METRIC_GLOSSARY, type MetricKey } from "../utils/metricGlossary"

import { EmptyState, IconTile, ProgressBar } from "./ui/primitives"

interface PerformanceCardProps {
  campaigns: Campaign[]
}

function PerformanceCard({ campaigns }: PerformanceCardProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    campaigns[0]?.id ?? 0
  )

  // Se o filtro de plataforma remover a campanha selecionada,
  // usa a primeira campanha disponível em vez de travar o card.
  const campaign =
    campaigns.find((campaign) => campaign.id === selectedCampaignId) ??
    campaigns[0]

  if (!campaign) {
    return (
      <section className="panel">
        <h2>Performance por campanha</h2>

        <EmptyState icon="target" title="Nenhuma campanha disponível">
          Não há campanhas para o filtro selecionado.
        </EmptyState>
      </section>
    )
  }

  const metrics = calculateCampaignMetrics(campaign)
  const totalInvestment = calculateTotalInvestment(campaigns)
  const share =
    totalInvestment > 0 ? (campaign.investment / totalInvestment) * 100 : 0

  const items: { key: MetricKey; value: string }[] = [
    { key: "ctr", value: formatPercent(metrics.ctr) },
    { key: "cpc", value: formatCurrency(metrics.cpc) },
    { key: "cpa", value: formatCurrency(metrics.cpa) },
    { key: "conversionRate", value: formatPercent(metrics.conversionRate) },
    { key: "roas", value: formatMultiplier(metrics.roas) },
  ]

  return (
    <section className="panel" aria-labelledby="performance-title">

      <div className="panel-header">
        <div className="section-title">
          <IconTile name="target" />
          <div>
            <h2 id="performance-title">Performance por campanha</h2>
            <p className="muted small">
              {campaign.name} · {campaign.platform}
            </p>
          </div>
        </div>

        <label className="field">
          Campanha

          <select
            value={campaign.id}
            onChange={(event) =>
              setSelectedCampaignId(Number(event.target.value))
            }
          >
            {campaigns.map((campaign) => (
              <option
                key={campaign.id}
                value={campaign.id}
              >
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ProgressBar
        label="Participação no investimento total"
        value={share}
        valueLabel={formatPercent(share)}
      />

      <dl className="metric-list">
        {items.map(({ key, value }) => {
          const definition = METRIC_GLOSSARY[key]

          return (
            <div key={key} className="metric">
              <dt>
                {definition.label}
                {definition.fullName && (
                  <span className="muted"> · {definition.fullName}</span>
                )}
              </dt>

              <dd>
                <strong className="metric-value">{value}</strong>
                <span>{definition.explanation}</span>
                <span className="muted">{definition.reading}</span>
              </dd>
            </div>
          )
        })}
      </dl>

    </section>
  )
}

export default PerformanceCard
