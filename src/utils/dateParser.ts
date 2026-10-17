// Converte as datas que aparecem nos relatórios de anúncios para o formato
// ISO (AAAA-MM-DD). Retorna null para células vazias e "invalid" para textos
// que não são datas.
//
// Formatos aceitos:
// - ISO: 2026-10-01, 2026-10-01 00:00:00, 2026-10-01T00:00:00Z
// - Brasileiro: 01/10/2026, 1/10/2026, 01-10-2026, 01.10.2026
//   (dia primeiro; se o segundo número passar de 12, entende como mês/dia)
// - Por extenso: "1 de out. de 2026", "1 de outubro de 2026", "Oct 1, 2026",
//   "1 Oct 2026"

const MONTHS: Record<string, number> = {
  jan: 1, janeiro: 1, january: 1,
  fev: 2, fevereiro: 2, feb: 2, february: 2,
  mar: 3, marco: 3, march: 3,
  abr: 4, abril: 4, apr: 4, april: 4,
  mai: 5, maio: 5, may: 5,
  jun: 6, junho: 6, june: 6,
  jul: 7, julho: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  set: 9, setembro: 9, sep: 9, sept: 9, september: 9,
  out: 10, outubro: 10, oct: 10, october: 10,
  nov: 11, novembro: 11, november: 11,
  dez: 12, dezembro: 12, dec: 12, december: 12,
}

const EMPTY = new Set(["", "-", "--", "—", "n/a"])

export type ParsedDate = string | null | "invalid"

function toIso(year: number, month: number, day: number): ParsedDate {
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) {
    return "invalid"
  }

  const date = new Date(Date.UTC(year, month - 1, day))

  // Rejeita datas que não existem, como 31/02.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return "invalid"
  }

  return date.toISOString().slice(0, 10)
}

function normalizeText(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function parseReportDate(raw: string | undefined | null): ParsedDate {
  const value = (raw ?? "").trim()

  if (EMPTY.has(value.toLowerCase())) {
    return null
  }

  // ISO, com ou sem horário
  let match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/)

  if (match) {
    return toIso(Number(match[1]), Number(match[2]), Number(match[3]))
  }

  // 01/10/2026, 1-10-2026, 01.10.2026
  match = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:\s.*)?$/)

  if (match) {
    const first = Number(match[1])
    const second = Number(match[2])
    const year = Number(match[3])

    return second > 12
      ? toIso(year, first, second)
      : toIso(year, second, first)
  }

  const text = normalizeText(value)

  // "1 de out de 2026", "1 de outubro de 2026", "1 oct 2026"
  match = text.match(/^(\d{1,2}) (?:de )?([a-z]+) (?:de )?(\d{4})$/)

  if (match && MONTHS[match[2]]) {
    return toIso(Number(match[3]), MONTHS[match[2]], Number(match[1]))
  }

  // "oct 1 2026" (a vírgula já foi removida)
  match = text.match(/^([a-z]+) (\d{1,2}) (\d{4})$/)

  if (match && MONTHS[match[1]]) {
    return toIso(Number(match[3]), MONTHS[match[1]], Number(match[2]))
  }

  return "invalid"
}
