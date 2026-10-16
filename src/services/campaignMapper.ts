import type { Campaign, CSVFormat } from "../types/campaign"

import {
  parseLocaleNumber,
  type DecimalSeparator,
} from "../utils/numberParser"

export type CampaignField = Exclude<keyof Campaign, "id">

export type NumericField = Exclude<CampaignField, "name" | "platform">

export const NUMERIC_FIELDS: NumericField[] = [
  "investment",
  "impressions",
  "clicks",
  "conversions",
  "revenue",
]

export const REQUIRED_FIELDS: CampaignField[] = [
  "name",
  "investment",
  "impressions",
  "clicks",
]

export const FIELD_LABELS: Record<CampaignField, string> = {
  name: "Campanha",
  platform: "Plataforma",
  investment: "Investimento",
  impressions: "Impressões",
  clicks: "Cliques",
  conversions: "Conversões",
  revenue: "Receita",
}

// Nomes de coluna aceitos, já normalizados (sem acento, minúsculos e sem o
// conteúdo entre parênteses). A ordem define a prioridade quando o arquivo
// tem mais de uma coluna candidata, como "Cliques (todos)" e "Cliques no link".
export const HEADER_ALIASES: Record<CampaignField, string[]> = {
  name: [
    "name",
    "nome",
    "campanha",
    "nome da campanha",
    "campaign",
    "campaign name",
  ],
  platform: ["platform", "plataforma", "rede", "network", "canal", "channel"],
  investment: [
    "investment",
    "investimento",
    "valor usado",
    "valor gasto",
    "amount spent",
    "custo",
    "cost",
    "gasto",
    "spend",
  ],
  impressions: ["impressions", "impressoes", "impr"],
  clicks: [
    "clicks",
    "cliques",
    "cliques no link",
    "link clicks",
  ],
  conversions: [
    "conversions",
    "conversoes",
    "conv",
    "compras",
    "purchases",
    "resultados",
    "results",
  ],
  revenue: [
    "revenue",
    "receita",
    "valor conv",
    "conv value",
    "valor de conversao",
    "conversion value",
    "valor de conversao das compras",
    "valor de conversao de compras",
    "valor de conversao das compras no site",
    "purchases conversion value",
    "website purchases conversion value",
  ],
}

const META_HINTS = [
  "valor usado",
  "amount spent",
  "resultados",
  "results",
  "alcance",
  "reach",
  "inicio dos relatorios",
  "reporting starts",
  "valor de conversao das compras",
  "purchases conversion value",
]

const GOOGLE_HINTS = [
  "custo",
  "cost",
  "impr",
  "valor conv",
  "conv value",
  "cod da moeda",
  "codigo da moeda",
  "currency code",
  "tipo de campanha",
  "campaign type",
  "status da campanha",
  "campaign status",
]

const DEFAULT_PLATFORM: Record<CSVFormat, string> = {
  analytica: "Não informada",
  meta: "Meta Ads",
  google: "Google Ads",
  generic: "Não informada",
}

export type ColumnMap = Partial<Record<CampaignField, number>>

export function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^\ufeff/, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function mapHeaders(headers: string[]): {
  columns: ColumnMap
  missing: CampaignField[]
} {
  const normalized = headers.map(normalizeHeader)
  const used = new Set<number>()
  const columns: ColumnMap = {}

  for (const field of Object.keys(HEADER_ALIASES) as CampaignField[]) {
    for (const alias of HEADER_ALIASES[field]) {
      const index = normalized.findIndex(
        (header, i) => header === alias && !used.has(i)
      )

      if (index >= 0) {
        columns[field] = index
        used.add(index)
        break
      }
    }
  }

  const missing = REQUIRED_FIELDS.filter(
    (field) => columns[field] === undefined
  )

  return { columns, missing }
}

export function detectFormat(headers: string[]): CSVFormat {
  const normalized = new Set(headers.map(normalizeHeader))

  const matches = (hints: string[]) =>
    hints.filter((hint) => normalized.has(hint)).length

  const meta = matches(META_HINTS)
  const google = matches(GOOGLE_HINTS)

  if (meta > 0 || google > 0) {
    return meta >= google ? "meta" : "google"
  }

  const templates = [
    ["name", "investment", "impressions", "clicks"],
    ["campanha", "investimento", "impressoes", "cliques"],
  ]

  if (
    templates.some((template) =>
      template.every((header) => normalized.has(header))
    )
  ) {
    return "analytica"
  }

  return "generic"
}

export interface RowMappingResult {
  campaign: Campaign | null
  errors: string[]
}

export function mapRowToCampaign(
  row: string[],
  columns: ColumnMap,
  options: {
    id: number
    format: CSVFormat
    decimalSeparator: DecimalSeparator
  }
): RowMappingResult {
  const errors: string[] = []

  const cell = (field: CampaignField) => {
    const index = columns[field]
    return index === undefined ? "" : (row[index] ?? "").trim()
  }

  const values = {} as Record<NumericField, number>

  for (const field of NUMERIC_FIELDS) {
    const raw = cell(field)
    const parsed = parseLocaleNumber(raw, options.decimalSeparator)

    if (parsed === null) {
      values[field] = 0
    } else if (Number.isNaN(parsed)) {
      errors.push(`${FIELD_LABELS[field]} com valor inválido ("${raw}").`)
    } else {
      values[field] = parsed
    }
  }

  const name = cell("name")

  if (!name) {
    errors.push("O nome da campanha está vazio.")
  }

  if (errors.length > 0) {
    return { campaign: null, errors }
  }

  return {
    campaign: {
      id: options.id,
      name,
      platform: cell("platform") || DEFAULT_PLATFORM[options.format],
      ...values,
    },
    errors,
  }
}
