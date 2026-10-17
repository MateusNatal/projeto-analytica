import {
  ALL_METRICS_AVAILABLE,
  type Campaign,
  type MetricAvailability,
} from "../types/campaign"

import { summarizeCampaigns } from "./dashboardMetrics"
import { formatCurrency, formatMultiplier, formatPercent } from "./formatters"
import { calculateCampaignMetrics } from "./metrics"

export type InsightLevel = "positive" | "info" | "warning" | "critical"

export interface Insight {
  id: string
  level: InsightLevel
  title: string
  message: string
}

// CTR abaixo deste valor é tratado como baixo. É uma referência comum para
// anúncios de busca e redes sociais; anúncios de display costumam ficar abaixo.
export const LOW_CTR_THRESHOLD = 1

// Impressões mínimas para avaliar o CTR sem tirar conclusões de poucos dados.
export const MIN_IMPRESSIONS_FOR_CTR = 1000

// CPA a partir de quantas vezes a média geral é considerado alto.
export const HIGH_CPA_FACTOR = 1.5

// Participação mínima no investimento para sugerir remanejar verba.
export const REALLOCATION_MIN_SHARE = 0.2

// O resumo geral vem primeiro, seguido dos pontos que pedem ação.
const LEVEL_ORDER: Record<InsightLevel, number> = {
  info: 0,
  critical: 1,
  warning: 2,
  positive: 3,
}

function listNames(campaigns: Campaign[]): string {
  const names = campaigns.map((campaign) => `"${campaign.name}"`)

  if (names.length <= 1) {
    return names.join("")
  }

  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`
}

// Gera observações automáticas a partir de regras simples e explicáveis.
// Cada regra usa apenas os dados informados, sem suposições externas.
// Métricas que o arquivo não traz não geram observações (não são zero).
export function generateInsights(
  campaigns: Campaign[],
  availability: MetricAvailability = ALL_METRICS_AVAILABLE
): Insight[] {
  const active = campaigns.filter((campaign) => campaign.investment > 0)

  if (active.length === 0) {
    return []
  }

  const insights: Insight[] = []
  const total = summarizeCampaigns(active)
  const totalMetrics = calculateCampaignMetrics(total)
  const hasRevenue = availability.revenue && total.revenue > 0
  const hasConversions = availability.conversions && total.conversions > 0

  const withMetrics = active.map((campaign) => ({
    campaign,
    metrics: calculateCampaignMetrics(campaign),
  }))

  if (!hasRevenue) {
    insights.push({
      id: "no-revenue",
      level: "info",
      title: "Sem dados de receita",
      message: availability.revenue
        ? "A receita das campanhas exibidas está zerada, então não dá para saber se os anúncios se pagaram."
        : "O arquivo não traz receita, então não dá para saber se os anúncios se pagaram. Inclua a receita ou o valor de conversão para ver o ROAS.",
    })
  } else if (totalMetrics.roas !== null) {
    const roas = totalMetrics.roas

    insights.push({
      id: "overall-roas",
      level: roas < 1 ? "critical" : "info",
      title:
        roas < 1
          ? "A receita não cobre o investimento"
          : "Retorno geral dos anúncios",
      message:
        roas < 1
          ? `Para cada R$ 1 investido, voltaram ${formatCurrency(roas)} em receita. No conjunto, os anúncios estão dando prejuízo.`
          : `Para cada R$ 1 investido, voltaram ${formatCurrency(roas)} em receita (ROAS ${formatMultiplier(roas)}). Lembre que receita não é lucro: confira se esse retorno cobre o custo dos produtos.`,
    })
  }

  if (hasRevenue) {
    const losing = withMetrics.filter(
      ({ metrics }) => metrics.roas !== null && metrics.roas < 1
    )

    // Com uma só campanha, o resumo geral já diz a mesma coisa.
    if (losing.length > 0 && active.length > 1) {
      insights.push({
        id: "roas-below-one",
        level: "critical",
        title:
          losing.length === 1
            ? "Campanha com receita menor que o investimento"
            : `${losing.length} campanhas com receita menor que o investimento`,
        message: `${listNames(losing.map(({ campaign }) => campaign))} ${losing.length === 1 ? "trouxe" : "trouxeram"} menos receita do que custou. Revise a segmentação e a oferta, ou reduza a verba.`,
      })
    }

    const ranked = withMetrics
      .filter(({ metrics }) => metrics.roas !== null)
      .sort((a, b) => (b.metrics.roas ?? 0) - (a.metrics.roas ?? 0))

    if (ranked.length >= 2) {
      const best = ranked[0]
      const worst = ranked[ranked.length - 1]
      const bestRoas = best.metrics.roas ?? 0
      const worstRoas = worst.metrics.roas ?? 0

      if (bestRoas >= 1) {
        insights.push({
          id: "best-roas",
          level: "positive",
          title: "Campanha com melhor retorno",
          message: `"${best.campaign.name}" tem o maior ROAS (${formatMultiplier(bestRoas)}): cada R$ 1 investido trouxe ${formatCurrency(bestRoas)} em receita.`,
        })
      }

      const worstShare = worst.campaign.investment / total.investment

      if (
        worst.campaign.id !== best.campaign.id &&
        worstShare >= REALLOCATION_MIN_SHARE &&
        bestRoas >= worstRoas * 2
      ) {
        insights.push({
          id: "reallocate-budget",
          level: "warning",
          title: "Oportunidade de remanejar verba",
          message: `"${worst.campaign.name}" recebe ${formatPercent(worstShare * 100)} do investimento, mas tem o menor ROAS (${formatMultiplier(worstRoas)}). Teste mover parte dessa verba para "${best.campaign.name}" e acompanhe o resultado.`,
        })
      }
    }
  }

  if (hasConversions) {
    const noConversions = withMetrics.filter(
      ({ campaign }) => campaign.conversions === 0
    )

    if (noConversions.length > 0) {
      const spent = noConversions.reduce(
        (sum, { campaign }) => sum + campaign.investment,
        0
      )

      insights.push({
        id: "no-conversions",
        level: "warning",
        title: "Investimento sem conversões",
        message: `${listNames(noConversions.map(({ campaign }) => campaign))} ${noConversions.length === 1 ? "gastou" : "gastaram"} ${formatCurrency(spent)} sem nenhuma conversão. Se o objetivo for vender, vale revisar essas campanhas.`,
      })
    }

    const averageCpa = totalMetrics.cpa

    if (averageCpa !== null) {
      const expensive = withMetrics.filter(
        ({ metrics }) =>
          metrics.cpa !== null && metrics.cpa > averageCpa * HIGH_CPA_FACTOR
      )

      if (expensive.length > 0) {
        insights.push({
          id: "high-cpa",
          level: "warning",
          title: "Conversões caras",
          message: `${listNames(expensive.map(({ campaign }) => campaign))} ${expensive.length === 1 ? "tem" : "têm"} custo por conversão bem acima da média geral (${formatCurrency(averageCpa)}).`,
        })
      }
    }
  }

  const lowCtr = withMetrics.filter(
    ({ campaign, metrics }) =>
      campaign.impressions >= MIN_IMPRESSIONS_FOR_CTR &&
      metrics.ctr !== null &&
      metrics.ctr < LOW_CTR_THRESHOLD
  )

  if (lowCtr.length > 0) {
    insights.push({
      id: "low-ctr",
      level: "warning",
      title: "Anúncios com poucos cliques",
      message: `${listNames(lowCtr.map(({ campaign }) => campaign))} ${lowCtr.length === 1 ? "tem" : "têm"} CTR abaixo de ${formatPercent(LOW_CTR_THRESHOLD)}: poucas pessoas que viram o anúncio clicaram. Teste outra imagem, título ou público. Em anúncios de display, CTR baixo é mais comum.`,
    })
  }

  return insights.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
}
