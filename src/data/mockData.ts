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

export const campaigns: Campaign[] = [
  {
    id: 1,
    name: "Black Friday",
    platform: "Instagram Ads",
    investment: 2000,
    impressions: 50000,
    clicks: 1250,
    conversions: 83,
    revenue: 8500,
  },

  {
    id: 2,
    name: "Campanha de Natal",
    platform: "Facebook Ads",
    investment: 1500,
    impressions: 32000,
    clicks: 820,
    conversions: 42,
    revenue: 4100,
  },

  {
    id: 3,
    name: "Institucional",
    platform: "Google Ads",
    investment: 800,
    impressions: 60000,
    clicks: 920,
    conversions: 18,
    revenue: 1200,
  },

  {
    id: 4,
    name: "Lançamento Produto",
    platform: "Instagram Ads",
    investment: 2500,
    impressions: 70000,
    clicks: 2100,
    conversions: 115,
    revenue: 12000,
  },

  {
    id: 5,
    name: "Remarketing",
    platform: "Google Ads",
    investment: 1200,
    impressions: 18000,
    clicks: 950,
    conversions: 76,
    revenue: 6200,
  },
]