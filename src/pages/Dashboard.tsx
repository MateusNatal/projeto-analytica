import { lazy, Suspense, useMemo, useState } from "react"
import CampaignTable from "../components/CampaignTable"

import { campaigns as sampleCampaigns } from "../data/mockData"

import {
  ALL_METRICS_AVAILABLE,
  type CampaignRow,
  type CSVImportResult,
  type MetricAvailability,
} from "../types/campaign"

import {
  ALL_PLATFORMS,
  getPlatforms,
  summarizeCampaigns,
} from "../utils/dashboardMetrics"
import {
  aggregateRows,
  applyFilters,
  buildCampaignIds,
  EMPTY_FILTERS,
  summarizeDates,
  type DashboardFilters,
} from "../utils/campaignData"
import { generateInsights } from "../utils/insights"
import { METRIC_GLOSSARY } from "../utils/metricGlossary"
import { isMetricAvailable, METRICS, type MetricKey } from "../utils/metricCatalog"

import Header from "../components/Header"
import StatCard from "../components/StatCard"
import PerformanceCard from "../components/PerformanceCard"
import AIInsights from "../components/AIInsights"
import CsvImport from "../components/CsvImport"
import RuleInsights from "../components/RuleInsights"
import Sidebar from "../components/Sidebar"
import ThemeToggle from "../components/ThemeToggle"
import AuthControls from "../components/AuthControls"
import InfoNotices from "../components/InfoNotices"
import FiltersPanel from "../components/FiltersPanel"
import { Button, EmptyState, Skeleton } from "../components/ui/primitives"
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

const SAMPLE_ROWS: CampaignRow[] = sampleCampaigns.map((campaign) => ({
  ...campaign,
  dateStart: null,
  dateEnd: null,
}))

// Indicadores principais e secundários, na ordem em que aparecem.
const MAIN_STATS: { metric: MetricKey; description: string; hint: string }[] = [
  { metric: "investment", description: "Total investido", hint: METRIC_GLOSSARY.investment.explanation },
  { metric: "revenue", description: "Receita gerada", hint: METRIC_GLOSSARY.revenue.reading },
  { metric: "roas", description: "Receita para cada R$ 1 investido", hint: METRIC_GLOSSARY.roas.reading },
  { metric: "conversions", description: "Conversões realizadas", hint: METRIC_GLOSSARY.conversions.explanation },
  { metric: "ctr", description: "Taxa de cliques geral", hint: METRIC_GLOSSARY.ctr.explanation },
]

const SECONDARY_STATS: { metric: MetricKey; description: string }[] = [
  { metric: "impressions", description: "Vezes que os anúncios apareceram" },
  { metric: "clicks", description: "Cliques nos anúncios" },
  { metric: "cpc", description: "Custo médio por clique" },
  { metric: "cpa", description: "Custo médio por conversão" },
]

function Dashboard() {
  const [rows, setRows] = useState<CampaignRow[]>(SAMPLE_ROWS)
  const [availability, setAvailability] = useState<MetricAvailability>(ALL_METRICS_AVAILABLE)
  const [dataSource, setDataSource] = useState(SAMPLE_SOURCE)
  const [dataFormat, setDataFormat] = useState<DatasetFormat>("sample")
  const [alreadySaved, setAlreadySaved] = useState(false)
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS)
  const { session, loading: authLoading } = useAuth()
  const isAdmin = useIsAdmin(session)
  const feedback = useFeedbackState()
  const showPreUse =
    supabase !== null &&
    !feedback.state.preUse &&
    !feedback.state.preUseDismissed &&
    !feedback.state.submitted

  // Derivados dos dados carregados (não dependem dos filtros).
  const campaignIds = useMemo(() => buildCampaignIds(rows), [rows])
  const allCampaigns = useMemo(() => aggregateRows(rows, campaignIds), [rows, campaignIds])
  const platforms = useMemo(() => getPlatforms(allCampaigns), [allCampaigns])
  const dates = useMemo(() => summarizeDates(rows), [rows])

  // Uma plataforma que não existe nos dados atuais equivale a "Todas".
  const activeFilters: DashboardFilters = {
    ...filters,
    platform: platforms.includes(filters.platform) ? filters.platform : ALL_PLATFORMS,
  }

  // Os filtros escolhem linhas originais; a soma por campanha é feita uma vez.
  const filtered = useMemo(
    () => applyFilters(rows, activeFilters, availability, campaignIds),
    // activeFilters é recriado a cada render; as dependências reais são estas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, filters, platforms, availability, campaignIds]
  )

  const filteredCampaigns = filtered.campaigns

  function loadRows(
    nextRows: CampaignRow[],
    nextAvailability: MetricAvailability,
    source: string,
    format: DatasetFormat,
    saved = false
  ) {
    setRows(nextRows)
    setAvailability(nextAvailability)
    setDataSource(source)
    setDataFormat(format)
    setAlreadySaved(saved)
    setFilters(EMPTY_FILTERS)
  }

  function handleImport(result: CSVImportResult, fileName: string) {
    loadRows(result.rows, result.availability, fileName, result.format)
  }

  const total = summarizeCampaigns(filteredCampaigns)
  const insights = generateInsights(filteredCampaigns, availability)
  const chartMetric: MetricKey =
    filters.metric && isMetricAvailable(filters.metric, availability)
      ? filters.metric
      : "investment"
  const hasResults = filteredCampaigns.length > 0

  return (
    <div className="shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      <Sidebar isAdmin={isAdmin} />

      <FeedbackDialog
        client={supabase}
        localState={feedback.state}
        onSubmitted={feedback.markSubmitted}
        isAdmin={isAdmin}
      />

      <main className="main" id="conteudo" tabIndex={-1}>
        <div className="main-inner">

          <Header dataSource={dataSource}>
            <AuthControls session={session} loading={authLoading} isAdmin={isAdmin} />
            <ThemeToggle />
          </Header>

          <InfoNotices session={session} />

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
                  loadRows(SAMPLE_ROWS, ALL_METRICS_AVAILABLE, SAMPLE_SOURCE, "sample")
                }
              />

              <div className="stack">
                {supabase && session && (
                  <SavedDatasets
                    client={supabase}
                    userId={session.user.id}
                    rows={rows}
                    availability={availability}
                    dataSource={dataSource}
                    dataFormat={dataFormat}
                    alreadySaved={alreadySaved}
                    onLoad={(loaded, dataset) =>
                      loadRows(loaded, dataset.availability, dataset.name, dataset.sourceFormat, true)
                    }
                    onSaved={() => setAlreadySaved(true)}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="page-section" id="visao-geral">
            <FiltersPanel
              filters={activeFilters}
              onChange={setFilters}
              platforms={platforms}
              allCampaigns={allCampaigns}
              dates={dates}
              availability={availability}
              shownCampaigns={filteredCampaigns.length}
            />

            {hasResults ? (
              <>
                <section className="stat-grid" aria-label="Resumo">
                  {MAIN_STATS.map(({ metric, description, hint }) => (
                    <StatCard
                      key={metric}
                      title={METRICS[metric].label}
                      icon={METRICS[metric].icon}
                      color={METRICS[metric].color}
                      value={METRICS[metric].format(METRICS[metric].value(total))}
                      description={description}
                      hint={hint}
                      unavailable={!isMetricAvailable(metric, availability)}
                    />
                  ))}
                </section>

                <section className="stat-grid stat-grid-compact" aria-label="Outros indicadores">
                  {SECONDARY_STATS.map(({ metric, description }) => (
                    <StatCard
                      key={metric}
                      compact
                      title={METRICS[metric].label}
                      icon={METRICS[metric].icon}
                      color={METRICS[metric].color}
                      value={METRICS[metric].format(METRICS[metric].value(total))}
                      description={description}
                      unavailable={!isMetricAvailable(metric, availability)}
                    />
                  ))}
                </section>
              </>
            ) : (
              <section className="panel">
                <EmptyState icon="filter" title="Nenhuma campanha encontrada com esses filtros">
                  Ajuste o período, a plataforma, as campanhas ou o valor mínimo
                  da métrica.
                </EmptyState>
                <div className="empty-actions">
                  <Button variant="primary" icon="close" onClick={() => setFilters(EMPTY_FILTERS)}>
                    Limpar filtros
                  </Button>
                </div>
              </section>
            )}
          </div>

          {hasResults && (
            <>
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
                  <CampaignChart
                    campaigns={filteredCampaigns}
                    rows={filtered.rows}
                    availability={availability}
                    metric={chartMetric}
                  />
                </Suspense>
              </div>

              <div className="page-section" id="campanhas">
                <PerformanceCard
                  key={dataSource}
                  campaigns={filteredCampaigns}
                  availability={availability}
                />

                <CampaignTable campaigns={filteredCampaigns} availability={availability} />
              </div>

              <div className="page-section" id="analise-ia">
                <AIInsights
                  campaigns={filteredCampaigns}
                  session={session}
                  availability={availability}
                />
              </div>
            </>
          )}

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
