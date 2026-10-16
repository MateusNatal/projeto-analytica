import { lazy, Suspense, useState } from "react"
import CampaignTable from "../components/CampaignTable"

import { campaigns as sampleCampaigns } from "../data/mockData"

import type { Campaign, CSVImportResult } from "../types/campaign"

import {
  ALL_PLATFORMS,
  filterCampaignsByPlatform,
  getPlatforms,
  summarizeCampaigns,
} from "../utils/dashboardMetrics"

import {
  formatCurrency,
  formatMultiplier,
  formatNumber,
  formatPercent,
} from "../utils/formatters"

import { generateInsights } from "../utils/insights"
import { METRIC_GLOSSARY } from "../utils/metricGlossary"
import { calculateCampaignMetrics } from "../utils/metrics"

import Header from "../components/Header"
import StatCard from "../components/StatCard"
import PerformanceCard from "../components/PerformanceCard"
import AIInsights from "../components/AIInsights"
import CsvImport from "../components/CsvImport"
import RuleInsights from "../components/RuleInsights"

// Os gráficos (Recharts) ficam em um arquivo separado, carregado sob demanda,
// para que o restante do painel apareça mais rápido.
const CampaignChart = lazy(() => import("../components/CampaignChart"))

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

  const total = summarizeCampaigns(filteredCampaigns)
  const totalMetrics = calculateCampaignMetrics(total)
  const insights = generateInsights(filteredCampaigns)

  return (
    <main className="app">

      <Header />

      <CsvImport
        dataSource={dataSource}
        onImport={handleImport}
        onUseSample={() => loadCampaigns(sampleCampaigns, SAMPLE_SOURCE)}
      />

      <section className="filters" aria-label="Filtros">

        <label className="field">
          Plataforma

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

        <span className="muted small">
          {filteredCampaigns.length} campanha(s) exibida(s)
        </span>

      </section>


      <section className="stat-grid" aria-label="Resumo">

        <StatCard
          title="Investimento"
          value={formatCurrency(total.investment)}
          description="Total investido"
          hint={METRIC_GLOSSARY.investment.explanation}
        />

        <StatCard
          title="Receita"
          value={formatCurrency(total.revenue)}
          description="Receita gerada"
          hint={METRIC_GLOSSARY.revenue.reading}
        />

        <StatCard
          title="ROAS"
          value={formatMultiplier(totalMetrics.roas)}
          description="Receita para cada R$ 1 investido"
          hint={METRIC_GLOSSARY.roas.reading}
        />

        <StatCard
          title="Conversões"
          value={formatNumber(total.conversions)}
          description="Conversões realizadas"
          hint={METRIC_GLOSSARY.conversions.explanation}
        />

        <StatCard
          title="CTR"
          value={formatPercent(totalMetrics.ctr)}
          description="Taxa de cliques geral"
          hint={METRIC_GLOSSARY.ctr.explanation}
        />

      </section>

      <RuleInsights insights={insights} />

      <Suspense
        fallback={<section className="panel muted">Carregando gráficos…</section>}
      >
        <CampaignChart campaigns={filteredCampaigns} />
      </Suspense>

      <PerformanceCard
        key={dataSource}
        campaigns={filteredCampaigns}
      />

      <CampaignTable campaigns={filteredCampaigns} />

      <AIInsights />

    </main>
  )
}

export default Dashboard
