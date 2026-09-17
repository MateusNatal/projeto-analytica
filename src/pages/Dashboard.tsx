import { useState } from "react"
import CampaignTable from "../components/CampaignTable"

import { campaigns } from "../data/mockData"

import {
  calculateTotalInvestment,
  calculateTotalConversions,
  calculateTotalRevenue,
  calculateTotalClicks,
  calculateTotalImpressions,
  filterCampaignsByPlatform,
} from "../utils/dashboardMetrics"

import Header from "../components/Header"
import StatCard from "../components/StatCard"
import CampaignChart from "../components/CampaignChart"
import PerformanceCard from "../components/PerformanceCard"
import AIInsights from "../components/AIInsights"

function Dashboard() {
  const [selectedPlatform, setSelectedPlatform] = useState("Todas")
  

  const filteredCampaigns = filterCampaignsByPlatform(
    campaigns,
    selectedPlatform
  )

  const totalInvestment = calculateTotalInvestment(filteredCampaigns)

  const totalConversions = calculateTotalConversions(filteredCampaigns)

  const totalRevenue = calculateTotalRevenue(filteredCampaigns)

  const totalClicks = calculateTotalClicks(filteredCampaigns)

  const totalImpressions = calculateTotalImpressions(filteredCampaigns)

  const totalROAS =
    totalInvestment > 0
      ? totalRevenue / totalInvestment
      : 0

  const totalCTR =
    totalImpressions > 0
      ? (totalClicks / totalImpressions) * 100
      : 0

  return (
    <main>

      <Header />

      <section>

        <label>
          Plataforma:

          <select
            value={selectedPlatform}
            onChange={(event) =>
              setSelectedPlatform(event.target.value)
            }
          >
            <option value="Todas">Todas</option>
            <option value="Instagram Ads">Instagram Ads</option>
            <option value="Facebook Ads">Facebook Ads</option>
            <option value="Google Ads">Google Ads</option>
          </select>
        </label>

      </section>


      <section>

        <StatCard
          title="Investimento"
          value={`R$ ${totalInvestment.toFixed(2)}`}
          description="Total investido"
        />

        <StatCard
          title="Conversões"
          value={totalConversions.toString()}
          description="Conversões realizadas"
        />

        <StatCard
          title="Receita"
          value={`R$ ${totalRevenue.toFixed(2)}`}
          description="Receita gerada"
        />

        <StatCard
          title="ROAS"
          value={totalROAS.toFixed(2)}
          description="Retorno sobre investimento"
        />

        <StatCard
          title="CTR"
          value={`${totalCTR.toFixed(2)}%`}
          description="Taxa de cliques geral"
        />

      </section>


      <section>

        <CampaignChart campaigns={filteredCampaigns} />

        <PerformanceCard campaigns={filteredCampaigns} />

      </section>
<CampaignTable campaigns={filteredCampaigns} />

      <AIInsights />

    </main>
  )
}

export default Dashboard