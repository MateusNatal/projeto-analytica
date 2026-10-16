import type { Campaign } from "../types/campaign"

import {
  formatCurrency,
  formatNumber,
} from "../utils/formatters"

interface CampaignTableProps {
  campaigns: Campaign[]
}

function CampaignTable({ campaigns }: CampaignTableProps) {
  return (
    <section>
      <h2>Campanhas</h2>

      <table>
        <thead>
          <tr>
            <th>Campanha</th>
            <th>Plataforma</th>
            <th>Investimento</th>
            <th>Impressões</th>
            <th>Cliques</th>
            <th>Conversões</th>
            <th>Receita</th>
          </tr>
        </thead>

        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.id}>
              <td>{campaign.name}</td>
              <td>{campaign.platform}</td>
              <td>{formatCurrency(campaign.investment)}</td>
              <td>{formatNumber(campaign.impressions)}</td>
              <td>{formatNumber(campaign.clicks)}</td>
              <td>{formatNumber(campaign.conversions)}</td>
              <td>{formatCurrency(campaign.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default CampaignTable