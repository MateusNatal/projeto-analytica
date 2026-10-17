import { describe, expect, it } from "vitest"

import { parseCampaignText } from "../src/services/csvParser"
import type { CampaignRow, MetricAvailability } from "../src/types/campaign"
import {
  aggregateRows,
  applyFilters,
  countActiveFilters,
  dailySeries,
  EMPTY_FILTERS,
  rowInPeriod,
  summarizeDates,
} from "../src/utils/campaignData"
import { parseReportDate } from "../src/utils/dateParser"
import { generateInsights } from "../src/utils/insights"
import { availableMetrics, isMetricAvailable } from "../src/utils/metricCatalog"
import { buildPrompt, computeMetrics, validatePayload } from "../api/insights"

import { readSample } from "./helpers"

// Dados fictícios, só para os testes.

const ALL: MetricAvailability = { conversions: true, revenue: true }

function row(overrides: Partial<CampaignRow>): CampaignRow {
  return {
    id: 1,
    name: "A",
    platform: "TikTok Ads",
    investment: 100,
    impressions: 1000,
    clicks: 50,
    conversions: 5,
    revenue: 300,
    dateStart: "2026-10-01",
    dateEnd: null,
    ...overrides,
  }
}

describe("parseReportDate", () => {
  it.each([
    ["2026-10-01", "2026-10-01"],
    ["2026-10-01 00:00:00", "2026-10-01"],
    ["2026-10-01T03:00:00Z", "2026-10-01"],
    ["01/10/2026", "2026-10-01"],
    ["1/10/2026", "2026-10-01"],
    ["01-10-2026", "2026-10-01"],
    ["10/25/2026", "2026-10-25"],
    ["1 de out. de 2026", "2026-10-01"],
    ["15 de março de 2026", "2026-03-15"],
    ["Oct 1, 2026", "2026-10-01"],
    ["1 Oct 2026", "2026-10-01"],
  ])("%s → %s", (raw, expected) => {
    expect(parseReportDate(raw)).toBe(expected)
  })

  it("vazio vira null e texto inválido é apontado", () => {
    expect(parseReportDate("")).toBeNull()
    expect(parseReportDate("--")).toBeNull()
    expect(parseReportDate("ontem")).toBe("invalid")
    expect(parseReportDate("31/02/2026")).toBe("invalid")
  })
})

describe("importação do TikTok Ads", () => {
  const result = parseCampaignText(readSample("tiktok-ads-exemplo.csv").toString("utf8"))

  it("reconhece o formato, a plataforma e as datas", () => {
    expect(result.format).toBe("tiktok")
    expect(result.rows).toHaveLength(21)
    expect(result.campaignCount).toBe(3)
    expect(result.hasDates).toBe(true)
    expect(result.availability).toEqual(ALL)
    expect(result.errors).toEqual([])
    expect(new Set(result.rows.map((item) => item.platform))).toEqual(new Set(["TikTok Ads"]))
    expect(summarizeDates(result.rows)).toMatchObject({ min: "2026-10-01", max: "2026-10-07" })
  })

  it("usa 'Clicks (destination)' e não 'Clicks (all)'", () => {
    const [first] = result.rows
    // Primeira linha do exemplo: 610 cliques no destino e 824 no total.
    expect(first).toMatchObject({
      name: "Lançamento Coleção Verão",
      dateStart: "2026-10-01",
      investment: 120,
      impressions: 38000,
      clicks: 610,
      conversions: 22,
      revenue: 2640,
    })
  })

  it("aceita cabeçalhos em português, números brasileiros e arquivo sem receita", () => {
    const text = [
      "Nome da campanha;Data;Custo;Impressões;Cliques (destino);Cliques (todos);Conversões",
      "Verão;01/10/2026;1.234,50;10.000;250;400;12",
      "Verão;02/10/2026;100,00;1.000;20;30;1",
    ].join("\n")

    const parsed = parseCampaignText(text)

    expect(parsed.format).toBe("tiktok")
    expect(parsed.availability).toEqual({ conversions: true, revenue: false })
    expect(parsed.warnings.some((warning) => warning.includes("receita"))).toBe(true)
    expect(parsed.rows.map((item) => [item.dateStart, item.investment, item.clicks])).toEqual([
      ["2026-10-01", 1234.5, 250],
      ["2026-10-02", 100, 20],
    ])
  })

  it("aponta data inválida pela linha", () => {
    const parsed = parseCampaignText(
      "Campaign name,Date,Cost,Impressions,Clicks (destination)\nA,2026-10-01,10,100,5\nB,amanhã,10,100,5"
    )

    expect(parsed.errors).toEqual([{ line: 3, message: 'Data inválida ("amanhã").' }])
    expect(parsed.rows).toHaveLength(1)
  })
})

describe("filtros", () => {
  const rows: CampaignRow[] = [
    row({ id: 1, name: "A", platform: "TikTok Ads", dateStart: "2026-10-01", investment: 100, revenue: 300 }),
    row({ id: 2, name: "A", platform: "TikTok Ads", dateStart: "2026-10-02", investment: 100, revenue: 100 }),
    row({ id: 3, name: "B", platform: "Meta Ads", dateStart: "2026-10-01", investment: 200, revenue: 100 }),
    row({ id: 4, name: "C", platform: "Meta Ads", dateStart: "2026-10-01", dateEnd: "2026-10-07", investment: 50, revenue: 500 }),
  ]

  it("sem filtros, soma cada campanha uma única vez", () => {
    const { campaigns } = applyFilters(rows, EMPTY_FILTERS, ALL)
    const total = (list: { investment: number }[]) =>
      list.reduce((sum, item) => sum + item.investment, 0)

    expect(campaigns.map((item) => [item.name, item.investment])).toEqual([
      ["A", 200],
      ["B", 200],
      ["C", 50],
    ])
    expect(total(campaigns)).toBe(total(rows))
  })

  it("não altera as linhas originais", () => {
    const before = structuredClone(rows)

    applyFilters(rows, { ...EMPTY_FILTERS, platform: "Meta Ads", metric: "roas", metricMin: 1 }, ALL)

    expect(rows).toEqual(before)
  })

  it("filtra por plataforma, campanhas e período", () => {
    expect(applyFilters(rows, { ...EMPTY_FILTERS, platform: "Meta Ads" }, ALL).campaigns.map((c) => c.name)).toEqual(["B", "C"])

    const keyB = JSON.stringify(["B", "Meta Ads"])
    expect(applyFilters(rows, { ...EMPTY_FILTERS, campaigns: [keyB] }, ALL).campaigns.map((c) => c.name)).toEqual(["B"])

    const day1 = applyFilters(rows, { ...EMPTY_FILTERS, dateFrom: "2026-10-01", dateTo: "2026-10-01" }, ALL)
    // C cobre 01 a 07/10 e só entra quando o período inteiro está selecionado.
    expect(day1.campaigns.map((c) => [c.name, c.investment])).toEqual([
      ["A", 100],
      ["B", 200],
    ])
  })

  it("linha de vários dias entra quando o período inteiro dela está no filtro", () => {
    const multi = rows[3]

    expect(rowInPeriod(multi, "2026-10-01", "2026-10-07")).toBe(true)
    expect(rowInPeriod(multi, "2026-10-02", "2026-10-07")).toBe(false)
    expect(rowInPeriod(row({ dateStart: null }), "2026-10-01", null)).toBe(false)
    expect(rowInPeriod(row({ dateStart: null }), null, null)).toBe(true)
  })

  it("valor mínimo vale para o total da campanha no período", () => {
    // ROAS de A no total: 400 / 200 = 2x; de B: 0,5x; de C: 10x.
    const result = applyFilters(rows, { ...EMPTY_FILTERS, metric: "roas", metricMin: 2 }, ALL)

    expect(result.campaigns.map((c) => c.name)).toEqual(["A", "C"])
    expect(result.rows.map((item) => item.id)).toEqual([1, 2, 4])
  })

  it("ignora o valor mínimo de métrica que o arquivo não traz", () => {
    const result = applyFilters(
      rows,
      { ...EMPTY_FILTERS, metric: "roas", metricMin: 2 },
      { conversions: true, revenue: false }
    )

    expect(result.campaigns).toHaveLength(3)
  })

  it("mantém o mesmo id de campanha quando os filtros mudam", () => {
    const all = applyFilters(rows, EMPTY_FILTERS, ALL).campaigns
    const meta = applyFilters(rows, { ...EMPTY_FILTERS, platform: "Meta Ads" }, ALL).campaigns

    expect(meta.find((c) => c.name === "C")?.id).toBe(all.find((c) => c.name === "C")?.id)
  })

  it("conta filtros ativos", () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0)
    expect(countActiveFilters({ ...EMPTY_FILTERS, platform: "Meta Ads", dateTo: "2026-10-02", metric: "ctr" })).toBe(2)
    expect(countActiveFilters({ ...EMPTY_FILTERS, metric: "ctr", metricMin: 1 })).toBe(1)
  })

  it("série diária calcula taxas sobre os totais do dia", () => {
    const series = dailySeries(
      [
        row({ dateStart: "2026-10-01", clicks: 10, impressions: 100 }),
        row({ name: "B", dateStart: "2026-10-01", clicks: 90, impressions: 900 }),
        row({ dateStart: "2026-10-02", clicks: 5, impressions: 1000 }),
        row({ dateStart: "2026-10-01", dateEnd: "2026-10-05", clicks: 999, impressions: 1000 }),
      ],
      "ctr"
    )

    // 01/10: 100 cliques em 1000 impressões = 10%; a linha de vários dias fica de fora.
    expect(series).toEqual([
      { date: "2026-10-01", value: 10 },
      { date: "2026-10-02", value: 0.5 },
    ])
  })

  it("aggregateRows soma linhas da mesma campanha de datas diferentes", () => {
    const [a] = aggregateRows(rows.slice(0, 2))
    expect(a).toMatchObject({ name: "A", investment: 200, revenue: 400 })
  })
})

describe("métricas ausentes", () => {
  it("só oferece métricas que o arquivo permite calcular", () => {
    const noRevenue = { conversions: true, revenue: false }

    expect(isMetricAvailable("roas", noRevenue)).toBe(false)
    expect(isMetricAvailable("cpa", noRevenue)).toBe(true)
    expect(availableMetrics({ conversions: false, revenue: false })).toEqual([
      "investment",
      "impressions",
      "clicks",
      "ctr",
      "cpc",
    ])
  })

  it("insights não tratam receita ausente como zero", () => {
    const insights = generateInsights(
      [row({ revenue: 0 }), row({ id: 2, name: "B", revenue: 0, conversions: 0 })],
      { conversions: false, revenue: false }
    )
    const ids = insights.map((insight) => insight.id)

    expect(ids).toContain("no-revenue")
    expect(ids).not.toContain("roas-below-one")
    expect(ids).not.toContain("no-conversions")
    expect(insights.find((insight) => insight.id === "no-revenue")?.message).toMatch(/não traz receita/)
  })

  it("IA: métricas ausentes viram null e saem dos dados enviados", () => {
    const campaign = { name: "A", platform: "TikTok Ads", investment: 100, impressions: 1000, clicks: 50, conversions: 0, revenue: 0 }

    expect(computeMetrics(campaign, ["revenue", "conversions"])).toMatchObject({ roas: null, cpa: null, conversionRatePercent: null })

    const { userMessage } = buildPrompt([campaign], ["revenue"])
    expect(userMessage).toMatch(/não informa: receita/)
    expect(userMessage).not.toMatch(/"revenue"/)
    expect(userMessage).toMatch(/"conversions":0/)
  })

  it("IA: valida a lista de métricas ausentes", () => {
    const base = { campaigns: [{ name: "A", platform: "X", investment: 1, impressions: 1, clicks: 1, conversions: 0, revenue: 0 }] }

    expect(validatePayload({ ...base, missingMetrics: ["revenue", "revenue"] })).toMatchObject({ ok: true, missing: ["revenue"] })
    expect(validatePayload({ ...base, missingMetrics: ["clicks"] }).ok).toBe(false)
    expect(validatePayload({ ...base, missingMetrics: "revenue" }).ok).toBe(false)
  })
})
