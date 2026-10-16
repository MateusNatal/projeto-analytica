import type { Campaign } from "../types/campaign"

export function calculateTotalInvestment(
  campaigns: Campaign[]
): number {
  return campaigns.reduce(
    (total, campaign) => total + campaign.investment,
    0
  )
}

export function calculateTotalConversions(
  campaigns: Campaign[]
): number {
  return campaigns.reduce(
    (total, campaign) => total + campaign.conversions,
    0
  )
}

export function calculateTotalRevenue(
  campaigns: Campaign[]
): number {
  return campaigns.reduce(
    (total, campaign) => total + campaign.revenue,
    0
  )
}

export function calculateTotalClicks(
  campaigns: Campaign[]
): number {
  return campaigns.reduce(
    (total, campaign) => total + campaign.clicks,
    0
  )
}

export function calculateTotalImpressions(
  campaigns: Campaign[]
): number {
  return campaigns.reduce(
    (total, campaign) => total + campaign.impressions,
    0
  )
}

export const ALL_PLATFORMS = "Todas"

export function getPlatforms(campaigns: Campaign[]): string[] {
  return [...new Set(campaigns.map((campaign) => campaign.platform))].sort(
    (a, b) => a.localeCompare(b, "pt-BR")
  )
}

export function filterCampaignsByPlatform(
  campaigns: Campaign[],
  platform: string
): Campaign[] {
  if (platform === ALL_PLATFORMS) {
    return campaigns
  }

  return campaigns.filter(
    (campaign) => campaign.platform === platform
  )
}