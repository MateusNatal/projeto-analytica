import { useState } from "react"
import CampaignTable from "../components/CampaignTable"

import { campaigns as sampleCampaigns } from "../data/mockData"

import type { Campaign, CSVImportResult } from "../types/campaign"

import {
  ALL_PLATFORMS,
  calculateTotalInvestment,
  calculateTotalConversions,
  calculateTotalRevenue,
  calculateTotalClicks,
  calculateTotalImpressions,
  filterCampaignsByPlatform,
  getPlatforms,
} from "../utils/dashboardMetrics"

import {
  formatCurrency,
  formatDecimal,
  formatNumber,
  formatPercent,
} from "../utils/formatters"

import Header from "../components/Header"
import StatCard from "../components/StatCard"
import CampaignChart from "../components/CampaignChart"
import PerformanceCard from "../components/PerformanceCard"
import AIInsights from "../components/AIInsights"
import CsvImport from "../components/CsvImport"

const SAMPLE_SOURCE = "Dados de exemplo"

function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(sampleCampaigns)
  const [dataSource, setDataSource] = useState(SAMPLE_SOURCE)
  const [selectedPlatform, setSelectedPlatform] = useState(ALL_PLATFORMS)

  const platforms = getPlatforms(campaigns)

  // Uma plataforma que não existe nos dados atuais equivale a "Todas".
  const activePlatform = platforms.includes(selectedPlatform)
    ? selectedPlatform
    : ALL_PLATFORMS

  const filteredCampaigns = filterCampaignsByPlatform(
    campaigns,
    activePlatform
  )

  function loadCampaigns(nextCampaigns: Campaign[], source: string) {
    setCampaigns(nextCampaigns)
    setDataSource(source)
    setSelectedPlatform(ALL_PLATFORMS)
  }

  function handleImport(result: CSVImportResult, fileName: string) {
    loadCampaigns(result.campaigns, fileName)
  }

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

      <CsvImport
        dataSource={dataSource}
        onImport={handleImport}
        onUseSample={() => loadCampaigns(sampleCampaigns, SAMPLE_SOURCE)}
      />

      <section>

        <label>
          Plataforma:

          <select
            value={activePlatform}
            onChange={(event) =>
              setSelectedPlatform(event.target.value)
            }
          >
            <option value={ALL_PLATFORMS}>{ALL_PLATFORMS}</option>
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </label>

      </section>


      <section>

        <StatCard
          title="Investimento"
          value={formatCurrency(totalInvestment)}
          description="Total investido"
        />

        <StatCard
          title="Conversões"
          value={formatNumber(totalConversions)}
          description="Conversões realizadas"
        />

        <StatCard
          title="Receita"
          value={formatCurrency(totalRevenue)}
          description="Receita gerada"
        />

        <StatCard
          title="ROAS"
          value={formatDecimal(totalROAS)}
          description="Retorno sobre investimento"
        />

        <StatCard
          title="CTR"
          value={formatPercent(totalCTR)}
          description="Taxa de cliques geral"
        />

      </section>


      <section>

        <CampaignChart campaigns={filteredCampaigns} />

        <PerformanceCard
          key={dataSource}
          campaigns={filteredCampaigns}
        />

      </section>
<CampaignTable campaigns={filteredCampaigns} />

      <AIInsights />

    </main>
  )
}

export default Dashboard