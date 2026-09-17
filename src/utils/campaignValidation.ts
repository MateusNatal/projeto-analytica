import type {
  Campaign,
  CampaignValidation,
} from "../types/campaign"

export function validateCampaign(
  campaign: Campaign
): CampaignValidation {
  const errors: string[] = []

  if (!campaign.name) {
    errors.push("O nome da campanha é obrigatório.")
  }

  if (!campaign.platform) {
    errors.push("A plataforma é obrigatória.")
  }

  if (campaign.investment < 0) {
    errors.push("O investimento não pode ser negativo.")
  }

  if (campaign.impressions < 0) {
    errors.push("As impressões não podem ser negativas.")
  }

  if (campaign.clicks < 0) {
    errors.push("Os cliques não podem ser negativos.")
  }

  if (campaign.conversions < 0) {
    errors.push("As conversões não podem ser negativas.")
  }

  if (campaign.revenue < 0) {
    errors.push("A receita não pode ser negativa.")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}