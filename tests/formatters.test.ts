import { describe, expect, it } from "vitest"

import {
  formatCurrency,
  formatDecimal,
  formatMultiplier,
  formatNumber,
  formatPercent,
  NOT_AVAILABLE,
} from "../src/utils/formatters"

import { normalizeSpaces } from "./helpers"

describe("formatadores pt-BR", () => {
  it("formata moeda em reais", () => {
    expect(normalizeSpaces(formatCurrency(2000))).toBe("R$ 2.000,00")
    expect(normalizeSpaces(formatCurrency(1.6))).toBe("R$ 1,60")
  })

  it("formata números com separador de milhar", () => {
    expect(formatNumber(230000)).toBe("230.000")
    expect(formatNumber(154.5)).toBe("154,5")
  })

  it("formata decimais, porcentagens e multiplicadores", () => {
    expect(formatDecimal(4.256)).toBe("4,26")
    expect(formatPercent(2.5)).toBe("2,50%")
    expect(formatMultiplier(4)).toBe("4,00x")
  })

  it("mostra traço quando o valor não está disponível", () => {
    expect(formatCurrency(null)).toBe(NOT_AVAILABLE)
    expect(formatNumber(null)).toBe(NOT_AVAILABLE)
    expect(formatDecimal(null)).toBe(NOT_AVAILABLE)
    expect(formatPercent(null)).toBe(NOT_AVAILABLE)
    expect(formatMultiplier(null)).toBe(NOT_AVAILABLE)
  })
})
