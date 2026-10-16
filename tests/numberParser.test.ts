import { describe, expect, it } from "vitest"

import {
  detectDecimalSeparator,
  isEmptyValue,
  parseLocaleNumber,
} from "../src/utils/numberParser"

describe("parseLocaleNumber", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["R$ 1.234,56", 1234.56],
    ["R$\u00a02.000,00", 2000],
    ["12,5", 12.5],
    ["50.000", 50000],
    ["1.234.567,8", 1234567.8],
    ["-5,25", -5.25],
    ["10,50%", 10.5],
    ["1500", 1500],
  ])("formato brasileiro: %s → %d", (raw, expected) => {
    expect(parseLocaleNumber(raw, ",")).toBeCloseTo(expected)
  })

  it.each([
    ["1,234.56", 1234.56],
    ["$1,234.56", 1234.56],
    ["980.45", 980.45],
    ["12,000", 12000],
  ])("formato americano: %s → %d", (raw, expected) => {
    expect(parseLocaleNumber(raw, ".")).toBeCloseTo(expected)
  })

  it.each(["", "  ", "--", "-", "—", "N/A", undefined, null])(
    "valor vazio (%s) retorna null",
    (raw) => {
      expect(parseLocaleNumber(raw, ",")).toBeNull()
    }
  )

  it.each(["abc", "12a", "1,2,3,4.5.6", "R$ dez"])(
    "texto inválido (%s) retorna NaN",
    (raw) => {
      expect(parseLocaleNumber(raw, ",")).toBeNaN()
    }
  )
})

describe("isEmptyValue", () => {
  it("reconhece marcadores de dado ausente", () => {
    expect(isEmptyValue("--")).toBe(true)
    expect(isEmptyValue("0")).toBe(false)
  })
})

describe("detectDecimalSeparator", () => {
  it("valores com os dois separadores decidem pelo último", () => {
    expect(detectDecimalSeparator(["1.234,56"])).toBe(",")
    expect(detectDecimalSeparator(["1,234.56"])).toBe(".")
  })

  it("vírgula com casas decimais indica padrão brasileiro", () => {
    expect(detectDecimalSeparator(["12,5", "1000"])).toBe(",")
  })

  it("ponto com casas decimais indica padrão americano", () => {
    expect(detectDecimalSeparator(["980.45", "18240"])).toBe(".")
  })

  it("só separadores de milhar: o tipo do milhar indica o decimal", () => {
    expect(detectDecimalSeparator(["50.000", "1.250"])).toBe(",")
    expect(detectDecimalSeparator(["12,000", "1,250"])).toBe(".")
  })

  it("sem pistas, assume o padrão brasileiro", () => {
    expect(detectDecimalSeparator(["100", "200", "--"])).toBe(",")
  })

  it("valores inequívocos têm prioridade sobre os ambíguos", () => {
    expect(detectDecimalSeparator(["1.250", "1.250", "99.90"])).toBe(".")
  })
})
