import type {
  Campaign,
  CampaignRow,
  MetricAvailability,
} from "../types/campaign"

import { ALL_PLATFORMS } from "./dashboardMetrics"
import { isMetricAvailable, METRICS, type MetricKey } from "./metricCatalog"

// Filtros e consolidação dos dados importados.
//
// As linhas originais (uma por campanha e período) nunca são alteradas: os
// filtros só escolhem quais linhas entram, e a soma por campanha é feita uma
// única vez sobre o resultado, para os indicadores, gráficos e tabela.

const NUMERIC = ["investment", "impressions", "clicks", "conversions", "revenue"] as const

export function campaignKey(row: Pick<Campaign, "name" | "platform">): string {
  return JSON.stringify([row.name, row.platform])
}

// Id estável por campanha, calculado sobre todas as linhas do arquivo. Assim
// a mesma campanha mantém o id quando os filtros mudam.
export function buildCampaignIds(rows: CampaignRow[]): Map<string, number> {
  const ids = new Map<string, number>()

  for (const row of rows) {
    const key = campaignKey(row)

    if (!ids.has(key)) {
      ids.set(key, ids.size + 1)
    }
  }

  return ids
}

export function aggregateRows(
  rows: CampaignRow[],
  ids: Map<string, number> = buildCampaignIds(rows)
): Campaign[] {
  const totals = new Map<string, Campaign>()

  for (const row of rows) {
    const key = campaignKey(row)
    let total = totals.get(key)

    if (!total) {
      total = {
        id: ids.get(key) ?? totals.size + 1,
        name: row.name,
        platform: row.platform,
        investment: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
      }
      totals.set(key, total)
    }

    for (const field of NUMERIC) {
      total[field] += row[field]
    }
  }

  return [...totals.values()].sort((a, b) => a.id - b.id)
}

// Datas -----------------------------------------------------------------------

export interface DateSummary {
  hasDates: boolean
  min: string | null
  max: string | null
  // Linhas sem data (ex.: arquivo misto) ou que cobrem vários dias.
  undatedRows: number
  multiDayRows: number
}

export function summarizeDates(rows: CampaignRow[]): DateSummary {
  let min: string | null = null
  let max: string | null = null
  let undatedRows = 0
  let multiDayRows = 0

  for (const row of rows) {
    if (!row.dateStart) {
      undatedRows++
      continue
    }

    const end = row.dateEnd ?? row.dateStart

    if (row.dateEnd) {
      multiDayRows++
    }

    if (!min || row.dateStart < min) min = row.dateStart
    if (!max || end > max) max = end
  }

  return { hasDates: min !== null, min, max, undatedRows, multiDayRows }
}

// Filtros ---------------------------------------------------------------------

export interface DashboardFilters {
  platform: string
  dateFrom: string | null
  dateTo: string | null
  // Chaves de campanha (campaignKey). Vazio = todas.
  campaigns: string[]
  // Filtro por valor mínimo de uma métrica.
  metric: MetricKey | null
  metricMin: number | null
}

export const EMPTY_FILTERS: DashboardFilters = {
  platform: ALL_PLATFORMS,
  dateFrom: null,
  dateTo: null,
  campaigns: [],
  metric: null,
  metricMin: null,
}

export function countActiveFilters(filters: DashboardFilters): number {
  return [
    filters.platform !== ALL_PLATFORMS,
    filters.dateFrom !== null || filters.dateTo !== null,
    filters.campaigns.length > 0,
    filters.metric !== null && filters.metricMin !== null,
  ].filter(Boolean).length
}

// Uma linha entra no período quando todo o intervalo dela está dentro das
// datas escolhidas. Linhas sem data só entram sem filtro de período.
export function rowInPeriod(
  row: CampaignRow,
  from: string | null,
  to: string | null
): boolean {
  if (!from && !to) {
    return true
  }

  if (!row.dateStart) {
    return false
  }

  const end = row.dateEnd ?? row.dateStart

  return (!from || row.dateStart >= from) && (!to || end <= to)
}

export interface FilteredData {
  rows: CampaignRow[]
  campaigns: Campaign[]
}

export function applyFilters(
  rows: CampaignRow[],
  filters: DashboardFilters,
  availability: MetricAvailability,
  ids: Map<string, number> = buildCampaignIds(rows)
): FilteredData {
  const selected = new Set(filters.campaigns)

  const filteredRows = rows.filter(
    (row) =>
      (filters.platform === ALL_PLATFORMS || row.platform === filters.platform) &&
      rowInPeriod(row, filters.dateFrom, filters.dateTo) &&
      (selected.size === 0 || selected.has(campaignKey(row)))
  )

  let campaigns = aggregateRows(filteredRows, ids)

  // O valor mínimo vale para o total da campanha no período, não para cada
  // linha: "campanhas com ROAS de pelo menos 2x no período".
  const { metric, metricMin } = filters

  if (metric && metricMin !== null && isMetricAvailable(metric, availability)) {
    const definition = METRICS[metric]

    campaigns = campaigns.filter((campaign) => {
      const value = definition.value(campaign)
      return value !== null && value >= metricMin
    })

    const kept = new Set(campaigns.map(campaignKey))
    return {
      rows: filteredRows.filter((row) => kept.has(campaignKey(row))),
      campaigns,
    }
  }

  return { rows: filteredRows, campaigns }
}

// Série diária ------------------------------------------------------------------

export interface DailyPoint {
  date: string
  value: number | null
}

// Total de uma métrica por dia, somando as campanhas. Métricas derivadas
// (CTR, CPA...) são calculadas sobre as somas do dia, nunca pela média das
// taxas de cada campanha. Linhas de vários dias ficam de fora da série.
export function dailySeries(rows: CampaignRow[], metric: MetricKey): DailyPoint[] {
  const byDay = new Map<string, CampaignRow[]>()

  for (const row of rows) {
    if (!row.dateStart || row.dateEnd) {
      continue
    }

    const list = byDay.get(row.dateStart) ?? []
    list.push(row)
    byDay.set(row.dateStart, list)
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayRows]) => {
      const [total] = aggregateRows(
        dayRows.map((row) => ({ ...row, name: "Total", platform: "" }))
      )
      return { date, value: METRICS[metric].value(total) }
    })
}
