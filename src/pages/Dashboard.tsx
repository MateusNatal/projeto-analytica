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

  const totalROAS = totalRevenue / totalInvestment

  const totalCPA = totalInvestment / totalConversions

  return (
    <main>

      <Header />

      <section>

        <StatCard
          title="Investimento"
          value={`R$ ${totalInvestment.toFixed(2)}`}
        />

        <StatCard
          title="Conversões"
          value={totalConversions.toString()}
        />

        <StatCard
          title="Receita"
          value={`R$ ${totalRevenue.toFixed(2)}`}
        />

        <StatCard
          title="ROAS"
          value={totalROAS.toFixed(2)}
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