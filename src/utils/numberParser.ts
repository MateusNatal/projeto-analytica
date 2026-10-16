export type DecimalSeparator = "," | "."

// Valores que as plataformas usam para "sem dado" (ex.: "--" no Google Ads).
const EMPTY_VALUES = new Set(["", "-", "--", "—", "n/a", "na", "nan"])

const NUMERIC_TEXT = /^-?[\d.,]+$/

// Remove símbolos de moeda, porcentagem, aspas e espaços (inclusive os
// não separáveis usados pelo Intl e pelo Excel).
export function cleanNumericText(raw: string): string {
  return raw
    .replace(/R\$|US\$|BRL|USD|[$%"']/gi, "")
    .replace(/[\s\u00a0\u202f]/g, "")
}

export function isEmptyValue(raw: string | undefined | null): boolean {
  if (raw === undefined || raw === null) {
    return true
  }

  return EMPTY_VALUES.has(cleanNumericText(raw).toLowerCase())
}

type SeparatorVote = DecimalSeparator | "thousands-comma" | "thousands-dot"

function voteForValue(value: string): SeparatorVote | null {
  const lastComma = value.lastIndexOf(",")
  const lastDot = value.lastIndexOf(".")

  if (lastComma >= 0 && lastDot >= 0) {
    return lastComma > lastDot ? "," : "."
  }

  if (lastComma >= 0) {
    // "1,250" pode ser mil duzentos e cinquenta (EUA) ou 1,25 (Brasil).
    return /^-?\d{1,3}(,\d{3})+$/.test(value) ? "thousands-comma" : ","
  }

  if (lastDot >= 0) {
    return /^-?\d{1,3}(\.\d{3})+$/.test(value) ? "thousands-dot" : "."
  }

  return null
}

// Descobre o separador decimal olhando todos os valores numéricos do
// arquivo. Valores inequívocos (ex.: "1.234,56" ou "12,5") decidem; se só
// houver casos ambíguos, o separador de milhar indica o decimal. Na falta de
// pistas, assume o padrão brasileiro.
export function detectDecimalSeparator(values: string[]): DecimalSeparator {
  let comma = 0
  let dot = 0
  let thousandsComma = 0
  let thousandsDot = 0

  for (const raw of values) {
    const value = cleanNumericText(raw)

    if (!NUMERIC_TEXT.test(value)) {
      continue
    }

    const vote = voteForValue(value)

    if (vote === ",") comma++
    else if (vote === ".") dot++
    else if (vote === "thousands-comma") thousandsComma++
    else if (vote === "thousands-dot") thousandsDot++
  }

  if (comma !== dot) {
    return comma > dot ? "," : "."
  }

  if (thousandsComma !== thousandsDot) {
    return thousandsComma > thousandsDot ? "." : ","
  }

  return ","
}

// Converte texto em número usando o separador decimal informado.
// Retorna null para células vazias e NaN para textos que não são números.
export function parseLocaleNumber(
  raw: string | undefined | null,
  decimalSeparator: DecimalSeparator
): number | null {
  if (isEmptyValue(raw)) {
    return null
  }

  const value = cleanNumericText(raw as string)

  if (!NUMERIC_TEXT.test(value)) {
    return Number.NaN
  }

  const thousandsSeparator = decimalSeparator === "," ? "." : ","

  const normalized = value
    .split(thousandsSeparator)
    .join("")
    .replace(decimalSeparator, ".")

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return Number.NaN
  }

  return Number(normalized)
}
