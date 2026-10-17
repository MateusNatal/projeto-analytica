// Campanha consolidada: soma das linhas de mesmo nome e plataforma dentro do
// período filtrado. É o que os indicadores, gráficos e tabelas exibem.
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

// Linha original do relatório. Quando o arquivo tem datas (ex.: relatório
// por dia), cada linha guarda o período a que se refere.
export interface CampaignRow extends Campaign {
  dateStart: string | null
  dateEnd: string | null
}

export interface CampaignValidation {
  valid: boolean
  errors: string[]
}

// Métricas que podem faltar no arquivo. Investimento, impressões e cliques
// são obrigatórios na importação.
export type OptionalMetricField = "conversions" | "revenue"

export const OPTIONAL_METRIC_FIELDS: OptionalMetricField[] = [
  "conversions",
  "revenue",
]

// Quais métricas opcionais existem nos dados carregados. Métrica ausente não
// é tratada como zero: ela simplesmente não é exibida.
export type MetricAvailability = Record<OptionalMetricField, boolean>

export const ALL_METRICS_AVAILABLE: MetricAvailability = {
  conversions: true,
  revenue: true,
}

// Origem detectada do arquivo importado.
export type CSVFormat = "analytica" | "meta" | "google" | "tiktok" | "generic"

export interface CSVImportIssue {
  line: number
  message: string
}

export interface CSVImportResult {
  rows: CampaignRow[]
  campaignCount: number
  format: CSVFormat
  rowsRead: number
  mergedRows: number
  availability: MetricAvailability
  hasDates: boolean
  errors: CSVImportIssue[]
  warnings: string[]
}
