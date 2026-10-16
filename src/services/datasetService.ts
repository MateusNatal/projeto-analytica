import type { SupabaseClient } from "@supabase/supabase-js"

import type { Campaign, CSVFormat } from "../types/campaign"

export type DatasetFormat = CSVFormat | "sample"

export interface SavedDataset {
  id: string
  name: string
  sourceFormat: DatasetFormat
  createdAt: string
  campaignCount: number
}

interface DatasetRow {
  id: string
  name: string
  source_format: DatasetFormat
  created_at: string
  campaigns: { count: number }[]
}

interface CampaignRow {
  id: number
  name: string
  platform: string
  investment: number | string
  impressions: number | string
  clicks: number | string
  conversions: number | string
  revenue: number | string
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

export function mapCampaignRow(row: CampaignRow, index: number): Campaign {
  return {
    id: index + 1,
    name: row.name,
    platform: row.platform,
    investment: toNumber(row.investment),
    impressions: toNumber(row.impressions),
    clicks: toNumber(row.clicks),
    conversions: toNumber(row.conversions),
    revenue: toNumber(row.revenue),
  }
}

export async function listDatasets(
  client: SupabaseClient
): Promise<SavedDataset[]> {
  const { data, error } = await client
    .from("datasets")
    .select("id, name, source_format, created_at, campaigns(count)")
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
  }))
}

export async function loadDatasetCampaigns(
  client: SupabaseClient,
  datasetId: string
): Promise<Campaign[]> {
  const { data, error } = await client
    .from("campaigns")
    .select(
      "id, name, platform, investment, impressions, clicks, conversions, revenue"
    )
    .eq("dataset_id", datasetId)
    .order("id", { ascending: true })

  if (error) {
    fail("abrir o arquivo salvo", error)
  }

  return (data as CampaignRow[]).map(mapCampaignRow)
}

export async function saveDataset(
  client: SupabaseClient,
  name: string,
  sourceFormat: DatasetFormat,
  campaigns: Campaign[]
): Promise<string> {
  const payload = campaigns.map((campaign) => ({
    name: campaign.name,
    platform: campaign.platform,
    investment: campaign.investment,
    impressions: campaign.impressions,
    clicks: campaign.clicks,
    conversions: campaign.conversions,
    revenue: campaign.revenue,
  }))

  const { data, error } = await client.rpc("save_dataset", {
    p_name: name.slice(0, 200),
    p_source_format: sourceFormat,
    p_campaigns: payload,
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
