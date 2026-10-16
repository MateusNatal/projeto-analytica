import { useState } from "react"
import type { Session } from "@supabase/supabase-js"

import type { Campaign } from "../types/campaign"

import { isSupabaseConfigured } from "../services/supabaseClient"

import Icon from "./ui/Icon"
import { Alert, Button, EmptyState, IconTile, Skeleton } from "./ui/primitives"

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

  const header = (
    <div className="section-title">
      <IconTile name="sparkles" />
      <div>
        <h2 id="ai-title">Análise com IA</h2>
        <p className="muted small">
          Uma explicação em linguagem simples, com recomendações para as
          campanhas exibidas.
        </p>
      </div>
    </div>
  )

  if (!isSupabaseConfigured) {
    return (
      <section className="panel" aria-labelledby="ai-title">
        {header}

        <EmptyState icon="sparkles" title="Disponível em breve">
          A análise com IA fica disponível quando o login estiver configurado.
        </EmptyState>
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
    <section className="panel" aria-labelledby="ai-title">
      <div className="panel-header">
        {header}

        {session && (
          <Button
            variant="primary"
            icon="sparkles"
            loading={status.kind === "loading"}
            disabled={campaigns.length === 0 || tooMany}
            onClick={handleGenerate}
          >
            {status.kind === "loading"
              ? "Gerando análise…"
              : status.kind === "done"
                ? "Gerar de novo"
                : "Gerar análise com IA"}
          </Button>
        )}
      </div>

      {!session ? (
        <EmptyState icon="user" title="Entre para usar a análise com IA">
          Faça login na seção “Dados”, no topo da página, para gerar
          explicações e recomendações das suas campanhas.
        </EmptyState>
      ) : (
        <p className="privacy-note">
          <Icon name="shield" />
          <span>
            Ao gerar a análise, os nomes e os números das campanhas exibidas são
            enviados à Gemini API, do Google, para processamento. No plano
            gratuito, o Google pode usar esses dados para melhorar os produtos
            dele. Nenhum outro dado da sua conta é enviado.
            {tooMany &&
              ` Filtre para no máximo ${MAX_CAMPAIGNS} campanhas antes de gerar.`}
          </span>
        </p>
      )}

      {status.kind === "loading" && (
        <Skeleton lines={4} block label="Gerando análise com IA…" />
      )}

      {status.kind === "error" && <Alert tone="error">{status.message}</Alert>}

      {status.kind === "done" && (
        <div className="ai-result" aria-live="polite">
          <p className="ai-summary">{status.analysis.summary}</p>

          <div className="ai-columns">
            {status.analysis.highlights.length > 0 && (
              <div>
                <h3>O que chama atenção</h3>
                <ul>
                  {status.analysis.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {status.analysis.recommendations.length > 0 && (
              <div>
                <h3>O que fazer agora</h3>
                <ul>
                  {status.analysis.recommendations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="ai-footer">
            <span>
              {status.analysis.caveat ||
                "Análise gerada por IA: confira os números antes de tomar decisões."}
            </span>
            <span className="tabular">
              Restam {status.remaining} análise(s) nas próximas 24 horas.
            </span>
          </div>
        </div>
      )}
    </section>
  )
}

export default AIInsights
