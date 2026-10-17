import type { Campaign, CampaignRow, CSVFormat } from "../types/campaign"

import { parseReportDate } from "../utils/dateParser"
import {
  parseLocaleNumber,
  type DecimalSeparator,
} from "../utils/numberParser"

export type CampaignField = Exclude<keyof Campaign, "id">

export type NumericField = Exclude<CampaignField, "name" | "platform">

// Colunas reconhecidas no arquivo: campos da campanha e as datas.
export type ColumnField = CampaignField | "dateStart" | "dateEnd"

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

export const FIELD_LABELS: Record<ColumnField, string> = {
  name: "Campanha",
  platform: "Plataforma",
  investment: "Investimento",
  impressions: "Impressões",
  clicks: "Cliques",
  conversions: "Conversões",
  revenue: "Receita",
  dateStart: "Data",
  dateEnd: "Data final",
}

// Nomes de coluna aceitos, normalizados (sem acento e em minúsculas). Cada
// cabeçalho é comparado de duas formas: com o texto entre parênteses (ex.:
// "clicks destination", para diferenciar "Clicks (destination)" de
// "Clicks (all)") e sem ele (ex.: "valor usado" para "Valor usado (BRL)").
// A ordem define a prioridade quando há mais de uma coluna candidata.
export const HEADER_ALIASES: Record<ColumnField, string[]> = {
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
    "custo total",
    "total cost",
    "gasto",
    "spend",
  ],
  impressions: ["impressions", "impressoes", "impr"],
  clicks: [
    // TikTok: "Clicks (destination)" é o clique que leva ao site.
    "clicks destination",
    "cliques destino",
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
    // TikTok
    "total complete payment value",
    "complete payment value",
    "valor total de pagamento concluido",
    "valor de pagamento concluido",
    "total purchase value",
    "purchase value",
    "valor total de compra",
    "valor de compra",
  ],
  dateStart: [
    "date",
    "data",
    "dia",
    "day",
    "stat time",
    "inicio dos relatorios",
    "reporting starts",
    "data de inicio",
    "start date",
  ],
  dateEnd: [
    "termino dos relatorios",
    "reporting ends",
    "data de termino",
    "data final",
    "end date",
  ],
}

const TIKTOK_HINTS = [
  "clicks destination",
  "cliques destino",
  "total complete payment value",
  "complete payment value",
  "complete payment roas",
  "valor total de pagamento concluido",
  "stat time",
  "tiktok",
]

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
  tiktok: "TikTok Ads",
  generic: "Não informada",
}

export type ColumnMap = Partial<Record<ColumnField, number>>

function baseNormalize(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^\ufeff/, "")
    .toLowerCase()
}

// Sem o conteúdo entre parênteses: "Valor usado (BRL)" -> "valor usado".
export function normalizeHeader(header: string): string {
  return baseNormalize(header)
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

// Com o conteúdo entre parênteses: "Clicks (destination)" -> "clicks destination".
export function normalizeHeaderFull(header: string): string {
  return baseNormalize(header)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function mapHeaders(headers: string[]): {
  columns: ColumnMap
  missing: CampaignField[]
} {
  const full = headers.map(normalizeHeaderFull)
  const short = headers.map(normalizeHeader)
  const used = new Set<number>()
  const columns: ColumnMap = {}

  for (const field of Object.keys(HEADER_ALIASES) as ColumnField[]) {
    for (const alias of HEADER_ALIASES[field]) {
      // Primeiro o nome completo (com parênteses), depois o nome curto.
      let index = full.findIndex((header, i) => header === alias && !used.has(i))

      if (index < 0) {
        index = short.findIndex((header, i) => header === alias && !used.has(i))
      }

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
  const names = new Set([
    ...headers.map(normalizeHeader),
    ...headers.map(normalizeHeaderFull),
  ])

  const matches = (hints: string[]) =>
    hints.filter((hint) => names.has(hint)).length

  if (matches(TIKTOK_HINTS) > 0) {
    return "tiktok"
  }

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
      template.every((header) => names.has(header))
    )
  ) {
    return "analytica"
  }

  return "generic"
}

export interface RowMappingResult {
  campaign: CampaignRow | null
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

  const cell = (field: ColumnField) => {
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

  const dates: Record<"dateStart" | "dateEnd", string | null> = {
    dateStart: null,
    dateEnd: null,
  }

  for (const field of ["dateStart", "dateEnd"] as const) {
    const raw = cell(field)
    const parsed = parseReportDate(raw)

    if (parsed === "invalid") {
      errors.push(`${FIELD_LABELS[field]} inválida ("${raw}").`)
    } else {
      dates[field] = parsed
    }
  }

  if (dates.dateStart && dates.dateEnd && dates.dateEnd < dates.dateStart) {
    errors.push("A data final é anterior à data inicial.")
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
      dateStart: dates.dateStart,
      // Só guarda a data final quando ela é diferente da inicial.
      dateEnd:
        dates.dateEnd && dates.dateEnd !== dates.dateStart ? dates.dateEnd : null,
    },
    errors,
  }
}
