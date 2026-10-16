const LOCALE = "pt-BR"

// Exibido quando uma métrica não pode ser calculada (ex.: CPA sem conversões).
export const NOT_AVAILABLE = "—"

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "BRL",
})

const numberFormatter = new Intl.NumberFormat(LOCALE)

const decimalFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(value: number | null): string {
  return value === null ? NOT_AVAILABLE : currencyFormatter.format(value)
}

export function formatNumber(value: number | null): string {
  return value === null ? NOT_AVAILABLE : numberFormatter.format(value)
}

export function formatDecimal(value: number | null): string {
  return value === null ? NOT_AVAILABLE : decimalFormatter.format(value)
}

// Recebe o valor já em pontos percentuais (ex.: 2.5 → "2,50%").
export function formatPercent(value: number | null): string {
  return value === null ? NOT_AVAILABLE : `${decimalFormatter.format(value)}%`
}

// ROAS como multiplicador: 4.25 → "4,25x".
export function formatMultiplier(value: number | null): string {
  return value === null ? NOT_AVAILABLE : `${decimalFormatter.format(value)}x`
}
