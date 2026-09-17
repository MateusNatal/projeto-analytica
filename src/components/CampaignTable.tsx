import type { Campaign } from "../types/campaign"

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
              <td>R$ {campaign.investment.toFixed(2)}</td>
              <td>{campaign.impressions}</td>
              <td>{campaign.clicks}</td>
              <td>{campaign.conversions}</td>
              <td>R$ {campaign.revenue.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default CampaignTable