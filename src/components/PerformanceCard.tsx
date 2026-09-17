import { useState } from "react"

import type { Campaign } from "../types/campaign"

import { calculateCampaignMetrics } from "../utils/metrics"

interface PerformanceCardProps {
  campaigns: Campaign[]
}

function PerformanceCard({ campaigns }: PerformanceCardProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    campaigns[0]?.id ?? 0
  )

  const campaign = campaigns.find(
    (campaign) => campaign.id === selectedCampaignId
  )

  if (!campaign) {
    return <p>Campanha não encontrada.</p>
  }

  const metrics = calculateCampaignMetrics(campaign)

  return (
    <section>

      <h2>Performance</h2>

      <label>
        Campanha:

        <select
          value={selectedCampaignId}
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
          {metrics.ctr.toFixed(2)}%
        </strong>
      </div>

      <div>
        <span>CPC</span>

        <strong>
          R$ {metrics.cpc.toFixed(2)}
        </strong>
      </div>

      <div>
        <span>CPA</span>

        <strong>
          R$ {metrics.cpa.toFixed(2)}
        </strong>
      </div>

      <div>
        <span>Conversão</span>

        <strong>
          {metrics.conversionRate.toFixed(2)}%
        </strong>
      </div>

      <div>
        <span>ROAS</span>

        <strong>
          {metrics.roas.toFixed(2)}
        </strong>
      </div>

    </section>
  )
}

export default PerformanceCard