import { describe, expect, it } from "vitest"

import {
  ALL_PLATFORMS,
  calculateTotalClicks,
  calculateTotalConversions,
  calculateTotalImpressions,
  calculateTotalInvestment,
  calculateTotalRevenue,
  filterCampaignsByPlatform,
  getPlatforms,
  summarizeCampaigns,
} from "../src/utils/dashboardMetrics"
import { calculateCampaignMetrics } from "../src/utils/metrics"
import { campaigns } from "../src/data/mockData"

describe("totais do painel", () => {
  it("soma os valores de todas as campanhas", () => {
    expect(calculateTotalInvestment(campaigns)).toBe(8000)
    expect(calculateTotalRevenue(campaigns)).toBe(32000)
    expect(calculateTotalConversions(campaigns)).toBe(334)
    expect(calculateTotalClicks(campaigns)).toBe(6040)
    expect(calculateTotalImpressions(campaigns)).toBe(230000)
  })

  it("retorna zero para lista vazia", () => {
    expect(calculateTotalInvestment([])).toBe(0)
  })

  it("calcula métricas gerais a partir do resumo", () => {
    const metrics = calculateCampaignMetrics(summarizeCampaigns(campaigns))

    expect(metrics.roas).toBeCloseTo(4)
    expect(metrics.ctr).toBeCloseTo(2.626, 3)
  })

  it("resumo de lista vazia não gera métricas", () => {
    expect(calculateCampaignMetrics(summarizeCampaigns([])).roas).toBeNull()
  })
})

describe("filtro de plataforma", () => {
  it("lista plataformas únicas em ordem alfabética", () => {
    expect(getPlatforms(campaigns)).toEqual([
      "Facebook Ads",
      "Google Ads",
      "Instagram Ads",
    ])
  })

  it("\"Todas\" retorna todas as campanhas", () => {
    expect(filterCampaignsByPlatform(campaigns, ALL_PLATFORMS)).toHaveLength(5)
  })

  it("filtra pela plataforma escolhida", () => {
    const google = filterCampaignsByPlatform(campaigns, "Google Ads")

    expect(google.map((campaign) => campaign.name)).toEqual([
      "Institucional",
      "Remarketing",
    ])
  })

  it("plataforma inexistente retorna lista vazia", () => {
    expect(filterCampaignsByPlatform(campaigns, "TikTok Ads")).toEqual([])
  })
})
