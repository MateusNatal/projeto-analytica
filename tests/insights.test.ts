import { describe, expect, it } from "vitest"

import { campaigns } from "../src/data/mockData"
import { generateInsights, type Insight } from "../src/utils/insights"

import { makeCampaign } from "./helpers"

const ids = (insights: Insight[]) => insights.map((insight) => insight.id)

const find = (insights: Insight[], id: string) =>
  insights.find((insight) => insight.id === id)

describe("generateInsights", () => {
  it("sem campanhas com investimento não gera insights", () => {
    expect(generateInsights([])).toEqual([])
    expect(generateInsights([makeCampaign({ investment: 0 })])).toEqual([])
  })

  it("dados de exemplo: resumo, CPA alto e melhor ROAS", () => {
    const insights = generateInsights(campaigns)

    expect(ids(insights)).toEqual(["overall-roas", "high-cpa", "best-roas"])
    expect(find(insights, "high-cpa")?.message).toContain('"Institucional"')
    expect(find(insights, "best-roas")?.message).toContain('"Remarketing"')
  })

  it("resumo vem primeiro e críticos antes de avisos", () => {
    const levels = generateInsights([
      makeCampaign({ id: 1, name: "Boa", revenue: 5000 }),
      makeCampaign({ id: 2, name: "Ruim", revenue: 500, impressions: 200000 }),
    ]).map((insight) => insight.level)

    expect(levels[0]).toBe("info")
    expect(levels.indexOf("critical")).toBeLessThan(levels.indexOf("warning"))
  })

  it("ROAS geral abaixo de 1 é crítico e não se repete com uma só campanha", () => {
    const insights = generateInsights([makeCampaign({ revenue: 500 })])

    expect(ids(insights)).toEqual(["overall-roas"])
    expect(insights[0].level).toBe("critical")
  })

  it("aponta só as campanhas com receita menor que o investimento", () => {
    const losing = find(
      generateInsights([
        makeCampaign({ id: 1, name: "Boa" }),
        makeCampaign({ id: 2, name: "Ruim", revenue: 500 }),
      ]),
      "roas-below-one"
    )

    expect(losing?.level).toBe("critical")
    expect(losing?.message).toContain('"Ruim"')
    expect(losing?.message).not.toContain('"Boa"')
  })

  it("aponta investimento sem conversões com o valor gasto", () => {
    const noConversions = find(
      generateInsights([
        makeCampaign({ id: 1, name: "Vende" }),
        makeCampaign({
          id: 2,
          name: "Não vende",
          conversions: 0,
          investment: 300,
        }),
      ]),
      "no-conversions"
    )

    expect(noConversions?.message).toContain('"Não vende"')
    expect(noConversions?.message).toMatch(/R\$\s300,00/)
  })

  it("aponta CTR baixo só com impressões suficientes", () => {
    const lowCtr = makeCampaign({ impressions: 100000, clicks: 500 })
    const fewImpressions = makeCampaign({ impressions: 500, clicks: 1 })

    expect(ids(generateInsights([lowCtr]))).toContain("low-ctr")
    expect(ids(generateInsights([fewImpressions]))).not.toContain("low-ctr")
  })

  it("sugere remanejar verba da pior para a melhor campanha", () => {
    const realloc = find(
      generateInsights([
        makeCampaign({ id: 1, name: "Boa", investment: 500, revenue: 3000 }),
        makeCampaign({ id: 2, name: "Fraca", investment: 1500, revenue: 2000 }),
      ]),
      "reallocate-budget"
    )

    expect(realloc?.message).toContain('"Fraca" recebe 75,00% do investimento')
    expect(realloc?.message).toContain('para "Boa"')
  })

  it("não sugere remanejar quando a pior campanha recebe pouca verba", () => {
    const insights = generateInsights([
      makeCampaign({ id: 1, name: "Boa", investment: 900, revenue: 9000 }),
      makeCampaign({ id: 2, name: "Pequena", investment: 100, revenue: 150 }),
    ])

    expect(ids(insights)).not.toContain("reallocate-budget")
  })

  it("sem receita, explica que não dá para calcular o retorno", () => {
    expect(ids(generateInsights([makeCampaign({ revenue: 0 })]))).toEqual([
      "no-revenue",
    ])
  })
})
