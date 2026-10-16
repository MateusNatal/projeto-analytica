import { describe, expect, it } from "vitest"

import {
  detectFormat,
  mapHeaders,
  mapRowToCampaign,
  normalizeHeader,
} from "../src/services/campaignMapper"

const BOM = String.fromCharCode(0xfeff)

describe("normalizeHeader", () => {
  it("remove acentos, parênteses, pontuação, caixa e BOM", () => {
    expect(normalizeHeader("Valor usado (BRL)")).toBe("valor usado")
    expect(normalizeHeader("Impressões")).toBe("impressoes")
    expect(normalizeHeader("Impr.")).toBe("impr")
    expect(normalizeHeader(`${BOM}Campanha`)).toBe("campanha")
  })
})

describe("mapHeaders", () => {
  it("reconhece o modelo em inglês", () => {
    const { columns, missing } = mapHeaders([
      "name",
      "platform",
      "investment",
      "impressions",
      "clicks",
      "conversions",
      "revenue",
    ])

    expect(missing).toEqual([])
    expect(columns).toEqual({
      name: 0,
      platform: 1,
      investment: 2,
      impressions: 3,
      clicks: 4,
      conversions: 5,
      revenue: 6,
    })
  })

  it("reconhece colunas do Meta Ads e prefere Compras a Resultados", () => {
    const { columns, missing } = mapHeaders([
      "Nome da campanha",
      "Impressões",
      "Resultados",
      "Valor usado (BRL)",
      "Cliques no link",
      "Compras",
      "Valor de conversão das compras",
    ])

    expect(missing).toEqual([])
    expect(columns.investment).toBe(3)
    expect(columns.conversions).toBe(5)
    expect(columns.revenue).toBe(6)
  })

  it("reconhece colunas do Google Ads", () => {
    const { columns, missing } = mapHeaders([
      "Status da campanha",
      "Campanha",
      "Impr.",
      "Cliques",
      "Custo",
      "Conversões",
      "Valor conv.",
    ])

    expect(missing).toEqual([])
    expect(columns.name).toBe(1)
    expect(columns.impressions).toBe(2)
    expect(columns.revenue).toBe(6)
  })

  it("informa colunas obrigatórias ausentes", () => {
    expect(mapHeaders(["Campanha", "Cliques"]).missing).toEqual([
      "investment",
      "impressions",
    ])
  })

  it("não usa a mesma coluna para dois campos", () => {
    const { columns } = mapHeaders(["Campanha", "Custo", "Impr.", "Cliques"])
    const indexes = Object.values(columns)

    expect(new Set(indexes).size).toBe(indexes.length)
  })
})

describe("detectFormat", () => {
  it.each([
    [["Nome da campanha", "Alcance", "Valor usado (BRL)"], "meta"],
    [["Campaign name", "Reach", "Amount spent (USD)"], "meta"],
    [["Campanha", "Impr.", "Custo", "Código da moeda"], "google"],
    [["name", "investment", "impressions", "clicks"], "analytica"],
    [["Campanha", "Investimento", "Impressões", "Cliques"], "analytica"],
    [["Nome", "Gasto", "Impressões", "Cliques"], "generic"],
  ])("%j → %s", (headers, expected) => {
    expect(detectFormat(headers)).toBe(expected)
  })
})

describe("mapRowToCampaign", () => {
  const { columns } = mapHeaders([
    "Campanha",
    "Investimento",
    "Impressões",
    "Cliques",
  ])

  it("converte a linha e usa a plataforma padrão do formato", () => {
    const { campaign, errors } = mapRowToCampaign(
      ["Verão", "1.234,56", "10.000", "250"],
      columns,
      { id: 7, format: "google", decimalSeparator: "," }
    )

    expect(errors).toEqual([])
    expect(campaign).toEqual({
      id: 7,
      name: "Verão",
      platform: "Google Ads",
      investment: 1234.56,
      impressions: 10000,
      clicks: 250,
      conversions: 0,
      revenue: 0,
    })
  })

  it("aponta o campo com valor inválido", () => {
    const { campaign, errors } = mapRowToCampaign(
      ["Verão", "abc", "10", "1"],
      columns,
      { id: 1, format: "analytica", decimalSeparator: "," }
    )

    expect(campaign).toBeNull()
    expect(errors).toEqual(['Investimento com valor inválido ("abc").'])
  })

  it("exige nome da campanha", () => {
    const { errors } = mapRowToCampaign(["", "10", "10", "1"], columns, {
      id: 1,
      format: "analytica",
      decimalSeparator: ",",
    })

    expect(errors).toEqual(["O nome da campanha está vazio."])
  })
})
