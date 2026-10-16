import type {
  Campaign,
  CampaignValidation,
} from "../types/campaign"

const NUMERIC_RULES = [
  {
    field: "investment",
    invalid: "O investimento precisa ser um número válido.",
    negative: "O investimento não pode ser negativo.",
  },
  {
    field: "impressions",
    invalid: "As impressões precisam ser um número válido.",
    negative: "As impressões não podem ser negativas.",
  },
  {
    field: "clicks",
    invalid: "Os cliques precisam ser um número válido.",
    negative: "Os cliques não podem ser negativos.",
  },
  {
    field: "conversions",
    invalid: "As conversões precisam ser um número válido.",
    negative: "As conversões não podem ser negativas.",
  },
  {
    field: "revenue",
    invalid: "A receita precisa ser um número válido.",
    negative: "A receita não pode ser negativa.",
  },
] as const

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

  for (const rule of NUMERIC_RULES) {
    const value = campaign[rule.field]

    if (!Number.isFinite(value)) {
      errors.push(rule.invalid)
    } else if (value < 0) {
      errors.push(rule.negative)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
