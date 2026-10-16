import Papa from "papaparse"

import type {
  Campaign,
  CSVImportIssue,
  CSVImportResult,
} from "../types/campaign"

import {
  detectFormat,
  FIELD_LABELS,
  HEADER_ALIASES,
  mapHeaders,
  mapRowToCampaign,
  normalizeHeader,
  NUMERIC_FIELDS,
  type ColumnMap,
} from "./campaignMapper"

import { validateCampaign } from "../utils/campaignValidation"
import { detectDecimalSeparator } from "../utils/numberParser"

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

const ACCEPTED_EXTENSIONS = [".csv", ".tsv", ".txt"]

// Quantas linhas iniciais procurar pelo cabeçalho. O Google Ads coloca o
// nome do relatório e o período antes da linha com os nomes das colunas.
const HEADER_SEARCH_LIMIT = 15

// Erro com mensagem pronta para ser exibida ao usuário.
export class CSVImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CSVImportError"
  }
}

// Detecta a codificação pelo BOM. Sem BOM, tenta UTF-8 e recorre ao
// Windows-1252, comum em arquivos salvos pelo Excel em português.
export function decodeFileContent(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes)
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes)
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder("windows-1252").decode(bytes)
  }
}

function findHeaderRow(rows: string[][]): {
  index: number
  columns: ColumnMap
} | null {
  let best: { index: number; columns: ColumnMap; score: number } | null =
    null

  const limit = Math.min(rows.length, HEADER_SEARCH_LIMIT)

  for (let index = 0; index < limit; index++) {
    const { columns, missing } = mapHeaders(rows[index])
    const score = Object.keys(columns).length

    if (score === 0) {
      continue
    }

    if (missing.length === 0) {
      return { index, columns }
    }

    if (!best || score > best.score) {
      best = { index, columns, score }
    }
  }

  return best
}

function isBlankRow(row: string[]): boolean {
  return row.every((cell) => cell.trim() === "")
}

// Linhas de total do Google Ads ("Total: conta", "Total: Pesquisa"...), que
// podem aparecer em qualquer coluna. Campanhas como "Total Flex" são mantidas.
function isTotalRow(row: string[], name: string): boolean {
  return (
    normalizeHeader(name) === "total" ||
    row.some((cell) => /^\s*total\s*:/i.test(cell))
  )
}

function describeMissingColumns(missing: (keyof typeof FIELD_LABELS)[]) {
  return missing
    .map(
      (field) =>
        `"${FIELD_LABELS[field]}" (aceitos: ${HEADER_ALIASES[field]
          .slice(0, 4)
          .join(", ")}…)`
    )
    .join("; ")
}

// Soma linhas da mesma campanha e plataforma, como acontece em exportações
// do Meta Ads com detalhamento por dia ou por conjunto de anúncios.
function mergeDuplicateCampaigns(campaigns: Campaign[]): Campaign[] {
  const merged = new Map<string, Campaign>()

  for (const campaign of campaigns) {
    const key = `${campaign.name}\u0000${campaign.platform}`
    const existing = merged.get(key)

    if (!existing) {
      merged.set(key, { ...campaign })
      continue
    }

    for (const field of NUMERIC_FIELDS) {
      existing[field] += campaign[field]
    }
  }

  return [...merged.values()].map((campaign, index) => ({
    ...campaign,
    id: index + 1,
  }))
}

const DELIMITERS = [",", ";", "\t", "|"]

// A detecção automática do Papa Parse confunde a vírgula decimal brasileira
// ("1.234,56") com o separador de colunas. Por isso cada delimitador é
// testado e vence o que encontra o cabeçalho mais completo.
function parseRows(text: string) {
  let best: {
    rows: string[][]
    header: ReturnType<typeof findHeaderRow>
    score: number
  } | null = null

  for (const delimiter of DELIMITERS) {
    const rows = Papa.parse<string[]>(text, {
      delimiter,
      skipEmptyLines: false,
    }).data

    const header = findHeaderRow(rows)

    const score = header
      ? Object.keys(header.columns).length +
        (mapHeaders(rows[header.index]).missing.length === 0 ? 100 : 0)
      : -1

    if (!best || score > best.score) {
      best = { rows, header, score }
    }
  }

  return best as NonNullable<typeof best>
}

export function parseCampaignText(text: string): CSVImportResult {
  const { rows, header } = parseRows(text.replace(/^\ufeff/, ""))

  if (rows.length === 0 || rows.every(isBlankRow)) {
    throw new CSVImportError("O arquivo está vazio.")
  }

  if (!header) {
    throw new CSVImportError(
      "Não encontramos o cabeçalho do arquivo. A primeira linha deve ter os nomes das colunas, como Campanha, Investimento, Impressões e Cliques."
    )
  }

  const { missing } = mapHeaders(rows[header.index])

  if (missing.length > 0) {
    throw new CSVImportError(
      `Colunas obrigatórias não encontradas: ${describeMissingColumns(missing)}.`
    )
  }

  const { columns } = header
  const format = detectFormat(rows[header.index])
  const dataRows = rows.slice(header.index + 1)

  const numericCells = dataRows.flatMap((row) =>
    NUMERIC_FIELDS.map((field) => {
      const index = columns[field]
      return index === undefined ? "" : (row[index] ?? "")
    })
  )

  const decimalSeparator = detectDecimalSeparator(numericCells)

  const campaigns: Campaign[] = []
  const errors: CSVImportIssue[] = []
  let rowsRead = 0
  let clicksAboveImpressions = 0

  dataRows.forEach((row, offset) => {
    const line = header.index + offset + 2

    if (isBlankRow(row)) {
      return
    }

    const nameIndex = columns.name as number
    const name = (row[nameIndex] ?? "").trim()

    if (isTotalRow(row, name)) {
      return
    }

    rowsRead++

    const result = mapRowToCampaign(row, columns, {
      id: campaigns.length + 1,
      format,
      decimalSeparator,
    })

    if (!result.campaign) {
      errors.push(...result.errors.map((message) => ({ line, message })))
      return
    }

    const validation = validateCampaign(result.campaign)

    if (!validation.valid) {
      errors.push(
        ...validation.errors.map((message) => ({ line, message }))
      )
      return
    }

    if (result.campaign.clicks > result.campaign.impressions) {
      clicksAboveImpressions++
    }

    campaigns.push(result.campaign)
  })

  if (campaigns.length === 0) {
    const firstError = errors[0]

    throw new CSVImportError(
      firstError
        ? `Nenhuma linha válida encontrada. Primeiro problema (linha ${firstError.line}): ${firstError.message}`
        : "O arquivo não tem linhas de campanha."
    )
  }

  const mergedCampaigns = mergeDuplicateCampaigns(campaigns)
  const warnings: string[] = []

  if (columns.conversions === undefined) {
    warnings.push(
      "Coluna de conversões não encontrada: conversões, CPA e taxa de conversão ficarão zerados."
    )
  }

  if (columns.revenue === undefined) {
    warnings.push(
      "Coluna de receita não encontrada: receita e ROAS ficarão zerados."
    )
  }

  if (clicksAboveImpressions > 0) {
    warnings.push(
      `${clicksAboveImpressions} linha(s) têm mais cliques do que impressões. Confira se as colunas estão corretas.`
    )
  }

  return {
    campaigns: mergedCampaigns,
    format,
    rowsRead,
    mergedRows: campaigns.length - mergedCampaigns.length,
    errors,
    warnings,
  }
}

export async function parseCampaignCSV(
  file: File
): Promise<CSVImportResult> {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()

  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    throw new CSVImportError(
      "Formato não suportado. Envie um arquivo .csv exportado do Meta Ads, do Google Ads ou do modelo da Analytica."
    )
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new CSVImportError("O arquivo é maior que 5 MB.")
  }

  const text = decodeFileContent(await file.arrayBuffer())

  return parseCampaignText(text)
}
