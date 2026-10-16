import { describe, expect, it } from "vitest"

import {
  calculateCampaignMetrics,
  calculateConversionRate,
  calculateCPA,
  calculateCPC,
  calculateCTR,
  calculateROAS,
} from "../src/utils/metrics"
import { campaigns } from "../src/data/mockData"

import { makeCampaign } from "./helpers"

describe("métricas de campanha", () => {
  const blackFriday = campaigns[0]

  it("calcula CTR em pontos percentuais", () => {
    expect(calculateCTR(blackFriday)).toBeCloseTo(2.5)
  })

  it("calcula CPC, CPA, taxa de conversão e ROAS", () => {
    expect(calculateCPC(blackFriday)).toBeCloseTo(1.6)
    expect(calculateCPA(blackFriday)).toBeCloseTo(24.0964, 4)
    expect(calculateConversionRate(blackFriday)).toBeCloseTo(6.64)
    expect(calculateROAS(blackFriday)).toBeCloseTo(4.25)
  })

  it("retorna null em vez de 0 quando a divisão é por zero", () => {
    const empty = makeCampaign({
      investment: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    })

    expect(calculateCampaignMetrics(empty)).toEqual({
      ctr: null,
      cpc: null,
      cpa: null,
      conversionRate: null,
      roas: null,
    })
  })

  it("não confunde CPA indisponível com CPA zero", () => {
    const noConversions = makeCampaign({ conversions: 0 })

    expect(calculateCPA(noConversions)).toBeNull()
    expect(calculateConversionRate(noConversions)).toBe(0)
  })

  it("ROAS zero quando há investimento e nenhuma receita", () => {
    expect(calculateROAS(makeCampaign({ revenue: 0 }))).toBe(0)
  })
})
