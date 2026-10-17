import type { Campaign, MetricAvailability } from "../types/campaign"

import {
  formatCurrency,
  formatMultiplier,
  formatNumber,
  formatPercent,
} from "../utils/formatters"
import { calculateCampaignMetrics } from "../utils/metrics"
import { METRICS, type MetricKey } from "../utils/metricCatalog"

import { IconTile } from "./ui/primitives"

interface CampaignTableProps {
  campaigns: Campaign[]
  availability: MetricAvailability
}

// Cabeçalho com a marca de cor da métrica, igual à dos gráficos.
function MetricHeader({ metric }: { metric: MetricKey }) {
  return (
    <th className="numeric">
      <span className="metric-dot" style={{ background: METRICS[metric].color }} aria-hidden="true" />
      {METRICS[metric].label}
    </th>
  )
}

const UNAVAILABLE = "—"

function CampaignTable({ campaigns, availability }: CampaignTableProps) {
  return (
    <section className="panel" aria-labelledby="table-title">
      <div className="section-title">
        <IconTile name="table" />
        <div>
          <h2 id="table-title">Todas as campanhas</h2>
          <p className="muted small">
            Totais de cada campanha no período filtrado. Role para o lado para
            ver todas as colunas. "—" indica métrica que o arquivo não traz.
          </p>
        </div>
      </div>

      <div className="table-wrapper" role="region" tabIndex={0} aria-labelledby="table-title">
        <table>
          <thead>
            <tr>
              <th>Campanha</th>
              <th>Plataforma</th>
              <MetricHeader metric="investment" />
              <MetricHeader metric="impressions" />
              <MetricHeader metric="clicks" />
              <MetricHeader metric="conversions" />
              <MetricHeader metric="revenue" />
              <MetricHeader metric="ctr" />
              <MetricHeader metric="cpc" />
              <MetricHeader metric="cpa" />
              <MetricHeader metric="roas" />
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
                  <td className="numeric">
                    {availability.conversions ? formatNumber(campaign.conversions) : UNAVAILABLE}
                  </td>
                  <td className="numeric">
                    {availability.revenue ? formatCurrency(campaign.revenue) : UNAVAILABLE}
                  </td>
                  <td className="numeric">{formatPercent(metrics.ctr)}</td>
                  <td className="numeric">{formatCurrency(metrics.cpc)}</td>
                  <td className="numeric">
                    {availability.conversions ? formatCurrency(metrics.cpa) : UNAVAILABLE}
                  </td>
                  <td className="numeric">
                    {availability.revenue ? formatMultiplier(metrics.roas) : UNAVAILABLE}
                  </td>
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
