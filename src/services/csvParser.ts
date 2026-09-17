import Papa from "papaparse"

import type { Campaign } from "../types/campaign"

import { mapCSVRowToCampaign } from "./campaignMapper"

interface CSVRow {
  id: string
  name: string
  platform: string
  investment: string
  impressions: string
  clicks: string
  conversions: string
  revenue: string
}

export function parseCampaignCSV(
  file: File
): Promise<Campaign[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
        const campaigns = results.data.map(
          mapCSVRowToCampaign
        )

        resolve(campaigns)
      },

      error: (error) => {
        reject(error)
      },
    })
  })
}