import type { SupabaseClient } from "@supabase/supabase-js"

import {
  ALL_METRICS_AVAILABLE,
  OPTIONAL_METRIC_FIELDS,
  type CampaignRow,
  type CSVFormat,
  type MetricAvailability,
  type OptionalMetricField,
} from "../types/campaign"

export type DatasetFormat = CSVFormat | "sample"

export interface SavedDataset {
  id: string
  name: string
  sourceFormat: DatasetFormat
  createdAt: string
  campaignCount: number
  availability: MetricAvailability
}

interface DatasetRow {
  id: string
  name: string
  source_format: DatasetFormat
  created_at: string
  available_fields: OptionalMetricField[] | null
  campaigns: { count: number }[]
}

interface CampaignDbRow {
  id: number
  name: string
  platform: string
  investment: number | string
  impressions: number | string
  clicks: number | string
  conversions: number | string
  revenue: number | string
  report_date?: string | null
  report_end_date?: string | null
}

export const MAX_SAVED_DATASETS = 50

export class DatasetServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DatasetServiceError"
  }
}

function fail(action: string, error: { message: string } | null): never {
  // A mensagem técnica fica no console; o usuário vê uma explicação simples.
  console.error(`[datasets] Falha ao ${action}:`, error?.message)
  throw new DatasetServiceError(
    `Não foi possível ${action}. Tente novamente em alguns instantes.`
  )
}

// Colunas numeric do Postgres podem chegar como texto, dependendo do valor.
function toNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value)
}

export function mapCampaignRow(row: CampaignDbRow, index: number): CampaignRow {
  return {
    id: index + 1,
    name: row.name,
    platform: row.platform,
    investment: toNumber(row.investment),
    impressions: toNumber(row.impressions),
    clicks: toNumber(row.clicks),
    conversions: toNumber(row.conversions),
    revenue: toNumber(row.revenue),
    dateStart: row.report_date ?? null,
    dateEnd: row.report_end_date ?? null,
  }
}

// Arquivos salvos antes do registro de métricas (coluna nula) são tratados
// como completos, que era o comportamento da época.
export function toAvailability(
  fields: OptionalMetricField[] | null
): MetricAvailability {
  if (!fields) {
    return { ...ALL_METRICS_AVAILABLE }
  }

  return {
    conversions: fields.includes("conversions"),
    revenue: fields.includes("revenue"),
  }
}

export function fromAvailability(
  availability: MetricAvailability
): OptionalMetricField[] {
  return OPTIONAL_METRIC_FIELDS.filter((field) => availability[field])
}

export async function listDatasets(
  client: SupabaseClient
): Promise<SavedDataset[]> {
  const { data, error } = await client
    .from("datasets")
    .select("id, name, source_format, created_at, available_fields, campaigns(count)")
    .order("created_at", { ascending: false })
    .limit(MAX_SAVED_DATASETS)

  if (error) {
    fail("carregar o histórico", error)
  }

  return (data as DatasetRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    sourceFormat: row.source_format,
    createdAt: row.created_at,
    campaignCount: row.campaigns[0]?.count ?? 0,
    availability: toAvailability(row.available_fields),
  }))
}

// O Supabase devolve no máximo 1000 linhas por consulta. Relatórios por dia
// podem passar disso, então as linhas são buscadas em páginas.
export const PAGE_SIZE = 1000

export async function loadDatasetCampaigns(
  client: SupabaseClient,
  datasetId: string
): Promise<CampaignRow[]> {
  const rows: CampaignDbRow[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("campaigns")
      .select(
        "id, name, platform, investment, impressions, clicks, conversions, revenue, report_date, report_end_date"
      )
      .eq("dataset_id", datasetId)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      fail("abrir o arquivo salvo", error)
    }

    const page = data as CampaignDbRow[]
    rows.push(...page)

    if (page.length < PAGE_SIZE) {
      break
    }
  }

  return rows.map(mapCampaignRow)
}

export async function saveDataset(
  client: SupabaseClient,
  name: string,
  sourceFormat: DatasetFormat,
  rows: CampaignRow[],
  availability: MetricAvailability
): Promise<string> {
  const payload = rows.map((row) => ({
    name: row.name,
    platform: row.platform,
    investment: row.investment,
    impressions: row.impressions,
    clicks: row.clicks,
    conversions: row.conversions,
    revenue: row.revenue,
    report_date: row.dateStart,
    report_end_date: row.dateEnd,
  }))

  const { data, error } = await client.rpc("save_dataset_v2", {
    p_name: name.slice(0, 200),
    p_source_format: sourceFormat,
    p_campaigns: payload,
    p_available_fields: fromAvailability(availability),
  })

  if (error) {
    fail("salvar o arquivo", error)
  }

  return data as string
}

export async function deleteDataset(
  client: SupabaseClient,
  datasetId: string
): Promise<void> {
  const { error } = await client.from("datasets").delete().eq("id", datasetId)

  if (error) {
    fail("excluir o arquivo", error)
  }
}
