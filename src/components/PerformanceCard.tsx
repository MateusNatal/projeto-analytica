import { useState } from "react"

import type { Campaign } from "../types/campaign"

import { calculateCampaignMetrics } from "../utils/metrics"
import {
  formatCurrency,
  formatDecimal,
  formatPercent,
} from "../utils/formatters"

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
      <section>
        <h2>Performance</h2>

        <p>Nenhuma campanha disponível para o filtro selecionado.</p>
      </section>
    )
  }

  const metrics = calculateCampaignMetrics(campaign)

  return (
    <section>

      <h2>Performance</h2>

      <label>
        Campanha:

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

      <p>
        Campanha analisada: {campaign.name}
      </p>

      <div>
        <span>CTR</span>

        <strong>
          {formatPercent(metrics.ctr)}
        </strong>
      </div>

      <div>
        <span>CPC</span>

        <strong>
          {formatCurrency(metrics.cpc)}
        </strong>
      </div>

      <div>
        <span>CPA</span>

        <strong>
          {formatCurrency(metrics.cpa)}
        </strong>
      </div>

      <div>
        <span>Conversão</span>

        <strong>
          {formatPercent(metrics.conversionRate)}
        </strong>
      </div>

      <div>
        <span>ROAS</span>

        <strong>
          {formatDecimal(metrics.roas)}
        </strong>
      </div>

    </section>
  )
}

export default PerformanceCard