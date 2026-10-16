import { describe, expect, it } from "vitest"

import { validateCampaign } from "../src/utils/campaignValidation"

import { makeCampaign } from "./helpers"

describe("validateCampaign", () => {
  it("aceita uma campanha válida", () => {
    expect(validateCampaign(makeCampaign())).toEqual({
      valid: true,
      errors: [],
    })
  })

  it("exige nome e plataforma", () => {
    const result = validateCampaign(makeCampaign({ name: "", platform: "" }))

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      "O nome da campanha é obrigatório.",
      "A plataforma é obrigatória.",
    ])
  })

  it("rejeita valores negativos com mensagem específica", () => {
    const result = validateCampaign(
      makeCampaign({ impressions: -1, revenue: -10 })
    )

    expect(result.errors).toEqual([
      "As impressões não podem ser negativas.",
      "A receita não pode ser negativa.",
    ])
  })

  it("rejeita NaN e infinito", () => {
    const result = validateCampaign(
      makeCampaign({ clicks: Number.NaN, investment: Infinity })
    )

    expect(result.errors).toEqual([
      "O investimento precisa ser um número válido.",
      "Os cliques precisam ser um número válido.",
    ])
  })

  it("aceita zeros", () => {
    const result = validateCampaign(
      makeCampaign({ investment: 0, conversions: 0, revenue: 0 })
    )

    expect(result.valid).toBe(true)
  })
})
