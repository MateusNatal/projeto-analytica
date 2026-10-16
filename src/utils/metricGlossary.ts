export type MetricKey =
  | "investment"
  | "revenue"
  | "conversions"
  | "ctr"
  | "cpc"
  | "cpa"
  | "conversionRate"
  | "roas"

export interface MetricDefinition {
  label: string
  // Nome completo da sigla, quando houver.
  fullName?: string
  // Explicação curta, sem jargão, para quem nunca viu a métrica.
  explanation: string
  // Como interpretar o número: maior é melhor ou menor é melhor.
  reading: string
}

export const METRIC_GLOSSARY: Record<MetricKey, MetricDefinition> = {
  investment: {
    label: "Investimento",
    explanation: "Quanto dinheiro foi gasto com os anúncios.",
    reading: "Compare sempre com a receita que ele trouxe.",
  },
  revenue: {
    label: "Receita",
    explanation: "Quanto foi vendido a partir dos anúncios.",
    reading: "Receita não é lucro: ainda é preciso descontar custos do produto.",
  },
  conversions: {
    label: "Conversões",
    explanation:
      "Quantas vezes alguém fez a ação que você queria, como comprar ou se cadastrar.",
    reading: "Quanto mais, melhor.",
  },
  ctr: {
    label: "CTR",
    fullName: "Taxa de cliques",
    explanation:
      "De cada 100 pessoas que viram o anúncio, quantas clicaram nele.",
    reading:
      "Quanto maior, mais o anúncio chama atenção. Abaixo de 1% costuma indicar anúncio pouco atrativo.",
  },
  cpc: {
    label: "CPC",
    fullName: "Custo por clique",
    explanation: "Quanto você pagou, em média, por cada clique no anúncio.",
    reading: "Quanto menor, melhor.",
  },
  cpa: {
    label: "CPA",
    fullName: "Custo por aquisição",
    explanation: "Quanto você pagou, em média, por cada conversão.",
    reading:
      "Quanto menor, melhor. Precisa ser menor que o lucro de cada venda.",
  },
  conversionRate: {
    label: "Taxa de conversão",
    explanation: "De cada 100 cliques, quantos viraram conversão.",
    reading:
      "Quanto maior, melhor. Se for baixa, o problema pode estar na página ou na oferta, não no anúncio.",
  },
  roas: {
    label: "ROAS",
    fullName: "Retorno sobre o gasto com anúncios",
    explanation: "Quantos reais de receita voltaram para cada R$ 1 investido.",
    reading:
      "Abaixo de 1x, a receita não cobre nem o anúncio. O mínimo saudável depende da sua margem de lucro.",
  },
}
