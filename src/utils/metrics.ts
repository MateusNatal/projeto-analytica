import type { Campaign } from "../data/mockData"

export function calculateCTR(campaign: Campaign): number {
  return (campaign.clicks / campaign.impressions) * 100
}

export function calculateCPC(campaign: Campaign): number {
  return campaign.investment / campaign.clicks
}

export function calculateCPA(campaign: Campaign): number {
  return campaign.investment / campaign.conversions
}

export function calculateConversionRate(campaign: Campaign): number {
  return (campaign.conversions / campaign.clicks) * 100
}

export function calculateROAS(campaign: Campaign): number {
  return campaign.revenue / campaign.investment
}