import { useState } from "react"
import type { Session } from "@supabase/supabase-js"

import type { Campaign } from "../types/campaign"

import { isSupabaseConfigured } from "../services/supabaseClient"

interface AIInsightsProps {
  campaigns: Campaign[]
  session: Session | null
}

interface AIAnalysis {
  summary: string
  highlights: string[]
  recommendations: string[]
  caveat: string
}

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; analysis: AIAnalysis; remaining: number }
  | { kind: "error"; message: string }

// Mesmo limite aplicado pelo servidor (api/insights.ts).
const MAX_CAMPAIGNS = 100

async function requestAnalysis(
  campaigns: Campaign[],
  accessToken: string
): Promise<{ analysis: AIAnalysis; remaining: number }> {
  const response = await fetch("/api/insights", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      campaigns: campaigns.map((campaign) => ({
        name: campaign.name,
        platform: campaign.platform,
        investment: campaign.investment,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        revenue: campaign.revenue,
      })),
    }),
  })

  const body = (await response.json().catch(() => null)) as {
    analysis?: AIAnalysis
    remaining?: number
    error?: string
  } | null

  if (!response.ok || !body?.analysis) {
    throw new Error(
      body?.error ??
        "A análise com IA não está disponível agora. Tente novamente mais tarde."
    )
  }

  return { analysis: body.analysis, remaining: body.remaining ?? 0 }
}

function AIInsights({ campaigns, session }: AIInsightsProps) {
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  if (!isSupabaseConfigured) {
    return (
      <section className="panel panel-muted">
        <h2>Análise com IA</h2>

        <p className="muted">
          Explicações e recomendações geradas por inteligência artificial
          ficam disponíveis quando o login estiver configurado.
        </p>
      </section>
    )
  }

  const tooMany = campaigns.length > MAX_CAMPAIGNS

  async function handleGenerate() {
    if (!session) {
      return
    }

    setStatus({ kind: "loading" })

    try {
      const result = await requestAnalysis(campaigns, session.access_token)
      setStatus({ kind: "done", ...result })
    } catch (caught) {
      setStatus({
        kind: "error",
        message:
          caught instanceof Error
            ? caught.message
            : "Não foi possível gerar a análise.",
      })
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Análise com IA</h2>
          <p className="muted small">
            Uma explicação em linguagem simples, com recomendações para as
            campanhas exibidas.
          </p>
        </div>

        {session && (
          <button
            type="button"
            className="button button-primary"
            disabled={
              status.kind === "loading" || campaigns.length === 0 || tooMany
            }
            onClick={handleGenerate}
          >
            {status.kind === "loading"
              ? "Gerando análise…"
              : status.kind === "done"
                ? "Gerar de novo"
                : "Gerar análise com IA"}
          </button>
        )}
      </div>

      {!session ? (
        <p className="empty-state">
          Entre na sua conta para gerar uma análise com IA.
        </p>
      ) : (
        <p className="muted small">
          Ao gerar a análise, os nomes e os números das campanhas exibidas são
          enviados à OpenAI para processamento. Nenhum outro dado da sua conta
          é enviado.
          {tooMany &&
            ` Filtre para no máximo ${MAX_CAMPAIGNS} campanhas antes de gerar.`}
        </p>
      )}

      {status.kind === "error" && (
        <div className="alert alert-error" role="alert">
          {status.message}
        </div>
      )}

      {status.kind === "done" && (
        <div className="ai-result" aria-live="polite">
          <p>{status.analysis.summary}</p>

          {status.analysis.highlights.length > 0 && (
            <>
              <h3>O que chama atenção</h3>
              <ul>
                {status.analysis.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}

          {status.analysis.recommendations.length > 0 && (
            <>
              <h3>O que fazer agora</h3>
              <ul>
                {status.analysis.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}

          <p className="muted small">
            {status.analysis.caveat ||
              "Análise gerada por IA: confira os números antes de tomar decisões."}{" "}
            Restam {status.remaining} análise(s) nas próximas 24 horas.
          </p>
        </div>
      )}
    </section>
  )
}

export default AIInsights
