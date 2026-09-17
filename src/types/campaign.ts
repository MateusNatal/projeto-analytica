export interface Campaign {
  id: number
  name: string
  platform: string
  investment: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

export interface CampaignValidation {
  valid: boolean
  errors: string[]
}