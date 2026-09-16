import type { Campaign } from "../data/mockData"

export function calculateCTR(campaign: Campaign): number {
  if (campaign.impressions === 0) {
    return 0
  }

  return (campaign.clicks / campaign.impressions) * 100
}

export function calculateCPC(campaign: Campaign): number {
  if (campaign.clicks === 0) {
    return 0
  }

  return campaign.investment / campaign.clicks
}

export function calculateCPA(campaign: Campaign): number {
  if (campaign.conversions === 0) {
    return 0
  }

  return campaign.investment / campaign.conversions
}

export function calculateConversionRate(campaign: Campaign): number {
  if (campaign.clicks === 0) {
    return 0
  }

  return (campaign.conversions / campaign.clicks) * 100
}

export function calculateROAS(campaign: Campaign): number {
  if (campaign.investment === 0) {
    return 0
  }

  return campaign.revenue / campaign.investment
}

export function calculateCampaignMetrics(campaign: Campaign) {
  return {
    ctr: calculateCTR(campaign),
    cpc: calculateCPC(campaign),
    cpa: calculateCPA(campaign),
    conversionRate: calculateConversionRate(campaign),
    roas: calculateROAS(campaign),
  }
}