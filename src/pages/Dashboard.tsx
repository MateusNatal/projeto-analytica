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
import Sidebar from "../components/Sidebar"
import ThemeToggle from "../components/ThemeToggle"
import { IconTile, Skeleton } from "../components/ui/primitives"
import AccountPanel from "../components/AccountPanel"
import SavedDatasets from "../components/SavedDatasets"

import { useAuth } from "../hooks/useAuth"
import { useFeedbackState } from "../hooks/useFeedbackState"
import { useIsAdmin } from "../hooks/useIsAdmin"
import FeedbackDialog from "../components/feedback/FeedbackDialog"
import PreUseQuestion from "../components/feedback/PreUseQuestion"
import type { DatasetFormat } from "../services/datasetService"
import { supabase } from "../services/supabaseClient"

// Os gráficos (Recharts) ficam em um arquivo separado, carregado sob demanda,
// para que o restante do painel apareça mais rápido.
const CampaignChart = lazy(() => import("../components/CampaignChart"))

// Painel de avaliações: só é baixado por administradores.
const AdminFeedback = lazy(() => import("../components/feedback/AdminFeedback"))

const SAMPLE_SOURCE = "Dados de exemplo"

function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(sampleCampaigns)
  const [dataSource, setDataSource] = useState(SAMPLE_SOURCE)
  const [dataFormat, setDataFormat] = useState<DatasetFormat>("sample")
  const [alreadySaved, setAlreadySaved] = useState(false)
  const { session, loading: authLoading } = useAuth()
  const isAdmin = useIsAdmin(session)
  const feedback = useFeedbackState()
  const showPreUse =
    supabase !== null &&
    !feedback.state.preUse &&
    !feedback.state.preUseDismissed &&
    !feedback.state.submitted
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

  function loadCampaigns(
    nextCampaigns: Campaign[],
    source: string,
    format: DatasetFormat,
    saved = false
  ) {
    setCampaigns(nextCampaigns)
    setDataSource(source)
    setDataFormat(format)
    setAlreadySaved(saved)
    setSelectedPlatform(ALL_PLATFORMS)
  }

  function handleImport(result: CSVImportResult, fileName: string) {
    loadCampaigns(result.campaigns, fileName, result.format)
  }

  const total = summarizeCampaigns(filteredCampaigns)
  const totalMetrics = calculateCampaignMetrics(total)
  const insights = generateInsights(filteredCampaigns)

  return (
    <div className="shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      <Sidebar isAdmin={isAdmin} />

      <ThemeToggle />

      <FeedbackDialog
        client={supabase}
        localState={feedback.state}
        onSubmitted={feedback.markSubmitted}
        isAdmin={isAdmin}
      />

      <main className="main" id="conteudo" tabIndex={-1}>
        <div className="main-inner">

          <Header dataSource={dataSource} />

          {showPreUse && (
            <PreUseQuestion
              onAnswer={feedback.answerPreUse}
              onSkip={feedback.skipPreUse}
            />
          )}

          <div className="page-section" id="dados">
            <div className="data-grid">
              <CsvImport
                onImport={handleImport}
                onUseSample={() =>
                  loadCampaigns(sampleCampaigns, SAMPLE_SOURCE, "sample")
                }
              />

              <div className="stack">
                <AccountPanel session={session} loading={authLoading} />

                {supabase && session && (
                  <SavedDatasets
                    client={supabase}
                    userId={session.user.id}
                    campaigns={campaigns}
                    dataSource={dataSource}
                    dataFormat={dataFormat}
                    alreadySaved={alreadySaved}
                    onLoad={(loaded, dataset) =>
                      loadCampaigns(loaded, dataset.name, dataset.sourceFormat, true)
                    }
                    onSaved={() => setAlreadySaved(true)}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="page-section" id="visao-geral">
            <section className="panel" aria-labelledby="overview-title">
              <div className="filters">
                <div className="section-title">
                  <IconTile name="overview" />
                  <div>
                    <h2 id="overview-title">Visão geral</h2>
                    <p className="filters-count">
                      {filteredCampaigns.length} campanha(s) exibida(s)
                    </p>
                  </div>
                </div>

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
              </div>
            </section>

            <section className="stat-grid" aria-label="Resumo">

              <StatCard
                title="Investimento"
                icon="wallet"
                value={formatCurrency(total.investment)}
                description="Total investido"
                hint={METRIC_GLOSSARY.investment.explanation}
              />

              <StatCard
                title="Receita"
                icon="trendingUp"
                value={formatCurrency(total.revenue)}
                description="Receita gerada"
                hint={METRIC_GLOSSARY.revenue.reading}
              />

              <StatCard
                title="ROAS"
                icon="target"
                value={formatMultiplier(totalMetrics.roas)}
                description="Receita para cada R$ 1 investido"
                hint={METRIC_GLOSSARY.roas.reading}
              />

              <StatCard
                title="Conversões"
                icon="checkCircle"
                value={formatNumber(total.conversions)}
                description="Conversões realizadas"
                hint={METRIC_GLOSSARY.conversions.explanation}
              />

              <StatCard
                title="CTR"
                icon="pointer"
                value={formatPercent(totalMetrics.ctr)}
                description="Taxa de cliques geral"
                hint={METRIC_GLOSSARY.ctr.explanation}
              />

            </section>
          </div>

          <div className="page-section" id="insights">
            <RuleInsights insights={insights} />
          </div>

          <div className="page-section" id="graficos">
            <Suspense
              fallback={
                <section className="panel">
                  <Skeleton lines={2} block label="Carregando gráficos…" />
                </section>
              }
            >
              <CampaignChart campaigns={filteredCampaigns} />
            </Suspense>
          </div>

          <div className="page-section" id="campanhas">
            <PerformanceCard
              key={dataSource}
              campaigns={filteredCampaigns}
            />

            <CampaignTable campaigns={filteredCampaigns} />
          </div>

          <div className="page-section" id="analise-ia">
            <AIInsights campaigns={filteredCampaigns} session={session} />
          </div>

          {supabase && isAdmin && (
            <div className="page-section" id="admin">
              <Suspense
                fallback={
                  <section className="panel">
                    <Skeleton lines={3} block label="Carregando painel de avaliações…" />
                  </section>
                }
              >
                <AdminFeedback client={supabase} />
              </Suspense>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default Dashboard
