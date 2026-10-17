import type {
  Campaign,
  MetricAvailability,
  OptionalMetricField,
} from "../types/campaign"

import {
  formatCurrency,
  formatMultiplier,
  formatNumber,
  formatPercent,
} from "./formatters"
import { calculateCampaignMetrics } from "./metrics"
import type { IconName } from "../components/ui/Icon"

// Catálogo único das métricas: nome, cor, formato, de onde vem o valor e de
// quais colunas do arquivo ela depende. Indicadores, gráficos, legendas e
// filtros usam este catálogo, para que cada métrica tenha sempre a mesma cor
// e só apareça quando os dados permitem calculá-la.

export type MetricKey =
  | "investment"
  | "revenue"
  | "impressions"
  | "clicks"
  | "conversions"
  | "ctr"
  | "cpc"
  | "cpa"
  | "conversionRate"
  | "roas"

export interface MetricDefinition {
  key: MetricKey
  label: string
  // Variável CSS com a cor da métrica (ver tokens.css).
  color: string
  icon: IconName
  format: (value: number | null) => string
  value: (campaign: Campaign) => number | null
  // Colunas opcionais necessárias para calcular a métrica.
  requires: OptionalMetricField[]
}

const derived = (campaign: Campaign) => calculateCampaignMetrics(campaign)

export const METRICS: Record<MetricKey, MetricDefinition> = {
  investment: {
    key: "investment",
    label: "Investimento",
    color: "var(--metric-investment)",
    icon: "wallet",
    format: formatCurrency,
    value: (campaign) => campaign.investment,
    requires: [],
  },
  revenue: {
    key: "revenue",
    label: "Receita",
    color: "var(--metric-revenue)",
    icon: "trendingUp",
    format: formatCurrency,
    value: (campaign) => campaign.revenue,
    requires: ["revenue"],
  },
  impressions: {
    key: "impressions",
    label: "Impressões",
    color: "var(--metric-impressions)",
    icon: "eye",
    format: formatNumber,
    value: (campaign) => campaign.impressions,
    requires: [],
  },
  clicks: {
    key: "clicks",
    label: "Cliques",
    color: "var(--metric-clicks)",
    icon: "pointer",
    format: formatNumber,
    value: (campaign) => campaign.clicks,
    requires: [],
  },
  conversions: {
    key: "conversions",
    label: "Conversões",
    color: "var(--metric-conversions)",
    icon: "checkCircle",
    format: formatNumber,
    value: (campaign) => campaign.conversions,
    requires: ["conversions"],
  },
  ctr: {
    key: "ctr",
    label: "CTR",
    color: "var(--metric-rate)",
    icon: "percent",
    format: formatPercent,
    value: (campaign) => derived(campaign).ctr,
    requires: [],
  },
  cpc: {
    key: "cpc",
    label: "CPC",
    color: "var(--metric-cost)",
    icon: "tag",
    format: formatCurrency,
    value: (campaign) => derived(campaign).cpc,
    requires: [],
  },
  cpa: {
    key: "cpa",
    label: "CPA",
    color: "var(--metric-cost)",
    icon: "tag",
    format: formatCurrency,
    value: (campaign) => derived(campaign).cpa,
    requires: ["conversions"],
  },
  conversionRate: {
    key: "conversionRate",
    label: "Taxa de conversão",
    color: "var(--metric-rate)",
    icon: "percent",
    format: formatPercent,
    value: (campaign) => derived(campaign).conversionRate,
    requires: ["conversions"],
  },
  roas: {
    key: "roas",
    label: "ROAS",
    color: "var(--metric-rate)",
    icon: "target",
    format: formatMultiplier,
    value: (campaign) => derived(campaign).roas,
    requires: ["revenue"],
  },
}

export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[]

export function isMetricAvailable(
  key: MetricKey,
  availability: MetricAvailability
): boolean {
  return METRICS[key].requires.every((field) => availability[field])
}

export function availableMetrics(availability: MetricAvailability): MetricKey[] {
  return METRIC_KEYS.filter((key) => isMetricAvailable(key, availability))
}
