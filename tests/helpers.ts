import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import type { Campaign } from "../src/types/campaign"

export function readSample(name: string): Buffer {
  return readFileSync(
    fileURLToPath(new URL(`../public/exemplos/${name}`, import.meta.url))
  )
}

export function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 1,
    name: "Campanha",
    platform: "Meta Ads",
    investment: 1000,
    impressions: 50000,
    clicks: 1000,
    conversions: 50,
    revenue: 4000,
    ...overrides,
  }
}

// O Intl usa espaço não separável entre "R$" e o valor.
export function normalizeSpaces(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, " ")
}
