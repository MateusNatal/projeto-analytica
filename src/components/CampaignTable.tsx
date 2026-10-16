import type { Campaign } from "../types/campaign"

import {
  formatCurrency,
  formatMultiplier,
  formatNumber,
  formatPercent,
} from "../utils/formatters"
import { calculateCampaignMetrics } from "../utils/metrics"

import { IconTile } from "./ui/primitives"

interface CampaignTableProps {
  campaigns: Campaign[]
}

function CampaignTable({ campaigns }: CampaignTableProps) {
  return (
    <section className="panel" aria-labelledby="table-title">
      <div className="section-title">
        <IconTile name="table" />
        <div>
          <h2 id="table-title">Todas as campanhas</h2>
          <p className="muted small">
            Números de cada campanha. Role para o lado para ver todas as colunas.
          </p>
        </div>
      </div>

      <div className="table-wrapper" role="region" tabIndex={0} aria-labelledby="table-title">
        <table>
          <thead>
            <tr>
              <th>Campanha</th>
              <th>Plataforma</th>
              <th className="numeric">Investimento</th>
              <th className="numeric">Impressões</th>
              <th className="numeric">Cliques</th>
              <th className="numeric">Conversões</th>
              <th className="numeric">Receita</th>
              <th className="numeric">CTR</th>
              <th className="numeric">CPA</th>
              <th className="numeric">ROAS</th>
            </tr>
          </thead>

          <tbody>
            {campaigns.map((campaign) => {
              const metrics = calculateCampaignMetrics(campaign)

              return (
                <tr key={campaign.id}>
                  <td>{campaign.name}</td>
                  <td>{campaign.platform}</td>
                  <td className="numeric">{formatCurrency(campaign.investment)}</td>
                  <td className="numeric">{formatNumber(campaign.impressions)}</td>
                  <td className="numeric">{formatNumber(campaign.clicks)}</td>
                  <td className="numeric">{formatNumber(campaign.conversions)}</td>
                  <td className="numeric">{formatCurrency(campaign.revenue)}</td>
                  <td className="numeric">{formatPercent(metrics.ctr)}</td>
                  <td className="numeric">{formatCurrency(metrics.cpa)}</td>
                  <td className="numeric">{formatMultiplier(metrics.roas)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default CampaignTable
