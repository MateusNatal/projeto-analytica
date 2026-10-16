const LOCALE = "pt-BR"

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "BRL",
})

const numberFormatter = new Intl.NumberFormat(LOCALE)

const decimalFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatDecimal(value: number): string {
  return decimalFormatter.format(value)
}

// Recebe o valor já em pontos percentuais (ex.: 2.5 → "2,50%").
export function formatPercent(value: number): string {
  return `${decimalFormatter.format(value)}%`
}
