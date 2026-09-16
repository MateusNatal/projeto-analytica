import { campaigns } from "../data/mockData"

import Header from "../components/Header"
import StatCard from "../components/StatCard"
import CampaignChart from "../components/CampaignChart"
import PerformanceCard from "../components/PerformanceCard"
import AIInsights from "../components/AIInsights"

function Dashboard() {
  const totalInvestment = campaigns.reduce(
    (total, campaign) => total + campaign.investment,
    0
  )

  const totalConversions = campaigns.reduce(
    (total, campaign) => total + campaign.conversions,
    0
  )

  const totalRevenue = campaigns.reduce(
    (total, campaign) => total + campaign.revenue,
    0
  )

  const totalClicks = campaigns.reduce(
    (total, campaign) => total + campaign.clicks,
    0
  )

  const totalImpressions = campaigns.reduce(
    (total, campaign) => total + campaign.impressions,
    0
  )

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

        <CampaignChart />

        <PerformanceCard />

      </section>


      <AIInsights />

    </main>
  )
}

export default Dashboard