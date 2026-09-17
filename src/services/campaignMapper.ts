import type { Campaign } from "../types/campaign"

interface CSVRow {
  id: string
  name: string
  platform: string
  investment: string
  impressions: string
  clicks: string
  conversions: string
  revenue: string
}

export function mapCSVRowToCampaign(
  row: CSVRow
): Campaign {
  return {
    id: Number(row.id),
    name: row.name,
    platform: row.platform,
    investment: Number(row.investment),
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
    conversions: Number(row.conversions),
    revenue: Number(row.revenue),
  }
}
