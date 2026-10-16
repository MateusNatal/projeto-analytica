export interface Campaign {
  id: number
  name: string
  platform: string
  investment: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

export interface CampaignValidation {
  valid: boolean
  errors: string[]
}

// Origem detectada do arquivo importado.
export type CSVFormat = "analytica" | "meta" | "google" | "generic"

export interface CSVImportIssue {
  line: number
  message: string
}

export interface CSVImportResult {
  campaigns: Campaign[]
  format: CSVFormat
  rowsRead: number
  mergedRows: number
  errors: CSVImportIssue[]
  warnings: string[]
}
