import type { Campaign } from "../types/campaign"

// Cada métrica retorna null quando não pode ser calculada (divisão por zero).
// Exibir 0 nesses casos seria enganoso: um CPA "R$ 0,00" para uma campanha
// sem conversões parece ótimo, quando na verdade não houve resultado.

function divide(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator
}

export function calculateCTR(campaign: Campaign): number | null {
  const ratio = divide(campaign.clicks, campaign.impressions)
  return ratio === null ? null : ratio * 100
}

export function calculateCPC(campaign: Campaign): number | null {
  return divide(campaign.investment, campaign.clicks)
}

export function calculateCPA(campaign: Campaign): number | null {
  return divide(campaign.investment, campaign.conversions)
}

export function calculateConversionRate(campaign: Campaign): number | null {
  const ratio = divide(campaign.conversions, campaign.clicks)
  return ratio === null ? null : ratio * 100
}

export function calculateROAS(campaign: Campaign): number | null {
  return divide(campaign.revenue, campaign.investment)
}

export interface CampaignMetrics {
  ctr: number | null
  cpc: number | null
  cpa: number | null
  conversionRate: number | null
  roas: number | null
}

export function calculateCampaignMetrics(campaign: Campaign): CampaignMetrics {
  return {
    ctr: calculateCTR(campaign),
    cpc: calculateCPC(campaign),
    cpa: calculateCPA(campaign),
    conversionRate: calculateConversionRate(campaign),
    roas: calculateROAS(campaign),
  }
}
