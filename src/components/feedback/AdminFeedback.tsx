import { useCallback, useEffect, useState } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  CHOICE_QUESTIONS,
  FEEDBACK_QUESTIONS,
  ROAS_QUESTION,
} from "../../utils/feedbackOptions"
import {
  collectComments,
  compareRoas,
  countChoice,
  feedbackToCsv,
  type FeedbackResponse,
  type OptionCount,
} from "../../utils/feedback"
import { formatNumber, formatPercent } from "../../utils/formatters"
import { FeedbackServiceError, listFeedback } from "../../services/feedbackService"

import Icon from "../ui/Icon"
import { Alert, Button, EmptyState, IconTile, Skeleton } from "../ui/primitives"
import { useToast } from "../ui/toastContext"

interface AdminFeedbackProps {
  client: SupabaseClient
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
})

const axisTick = { fill: "var(--chart-text)", fontSize: 12 }

const tooltipStyle = {
  contentStyle: {
    background: "var(--surface-solid)",
    border: "1px solid var(--border-strong)",
    borderRadius: 12,
    color: "var(--text)",
  },
  labelStyle: { color: "var(--text)", fontWeight: 600 },
  itemStyle: { color: "var(--text)" },
  cursor: { fill: "var(--hover)" },
}

function percentLabel(value: unknown): string {
  return formatPercent(Number(value))
}

// Uma pergunta = uma série. Barras horizontais com a porcentagem no fim.
function DistributionChart({ data }: { data: OptionCount[] }) {
  const longest = Math.max(...data.map((item) => item.label.length))

  return (
    <ResponsiveContainer width="100%" height={data.length * 40 + 24}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--grid)" />
        <XAxis type="number" hide domain={[0, 100]} />
        <YAxis
          type="category"
          dataKey="label"
          width={Math.min(200, longest * 6.6 + 12)}
          tick={axisTick}
          stroke="var(--axis)"
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(_value, _name, item) => {
            const row = item.payload as OptionCount
            return [`${formatNumber(row.count)} (${formatPercent(row.percent)})`, "Respostas"]
          }}
        />
        {/* minPointSize garante que opções sem resposta mostrem "0%" em vez de nada */}
        <Bar dataKey="percent" fill="var(--series-1)" barSize={18} radius={[0, 4, 4, 0]} minPointSize={2}>
          <LabelList
            dataKey="percent"
            position="right"
            formatter={percentLabel}
            fill="var(--chart-text)"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function downloadCsv(responses: FeedbackResponse[]) {
  const blob = new Blob([feedbackToCsv(responses)], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const today = new Date().toISOString().slice(0, 10)

  link.href = url
  link.download = `analytica-avaliacoes-${today}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// Painel visível só para administradores. Mesmo assim, quem protege os dados
// é o banco: as políticas de RLS só devolvem avaliações para administradores.
function AdminFeedback({ client }: AdminFeedbackProps) {
  const toast = useToast()
  const [responses, setResponses] = useState<FeedbackResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      setResponses(await listFeedback(client))
    } catch (caught) {
      setError(
        caught instanceof FeedbackServiceError
          ? caught.message
          : "Não foi possível carregar as avaliações."
      )
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    let active = true

    listFeedback(client)
      .then((list) => active && setResponses(list))
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof FeedbackServiceError
              ? caught.message
              : "Não foi possível carregar as avaliações."
          )
        }
      })
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [client])

  const header = (
    <div className="panel-header">
      <div className="section-title">
        <IconTile name="shield" />
        <div>
          <h2 id="admin-title">Painel de avaliações</h2>
          <p className="muted small">
            Área restrita a administradores. Os dados mostrados são as
            respostas reais enviadas pela aba Feedback.
          </p>
        </div>
      </div>

      <div className="csv-import-actions">
        <Button size="sm" icon="refresh" onClick={load} loading={loading} disabled={loading}>
          Atualizar
        </Button>
        <Button
          size="sm"
          variant="primary"
          icon="download"
          disabled={!responses || responses.length === 0}
          onClick={() => {
            if (responses) {
              downloadCsv(responses)
              toast.show(`${responses.length} avaliação(ões) exportada(s) em CSV.`)
            }
          }}
        >
          Exportar CSV
        </Button>
      </div>
    </div>
  )

  if (loading && !responses) {
    return (
      <section className="panel" aria-labelledby="admin-title">
        {header}
        <Skeleton lines={3} block label="Carregando avaliações…" />
      </section>
    )
  }

  if (error && !responses) {
    return (
      <section className="panel" aria-labelledby="admin-title">
        {header}
        <Alert tone="error">{error}</Alert>
      </section>
    )
  }

  if (!responses || responses.length === 0) {
    return (
      <section className="panel" aria-labelledby="admin-title">
        {header}
        <EmptyState icon="users" title="Ainda não há avaliações">
          Quando os participantes enviarem o formulário da aba Feedback, a
          quantidade de respostas, os gráficos e as sugestões aparecem aqui.
        </EmptyState>
      </section>
    )
  }

  const roas = compareRoas(responses)
  const comments = collectComments(responses)
  const lastDate = responses[0]?.created_at

  const roasChartData = roas.before.map((before, index) => ({
    label: before.label,
    antes: before.percent,
    depois: roas.after[index].percent,
    antesCount: before.count,
    depoisCount: roas.after[index].count,
  }))

  return (
    <section className="panel admin" aria-labelledby="admin-title">
      {header}

      {error && <Alert tone="error">{error}</Alert>}

      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-title">Avaliações recebidas</span>
          <strong className="stat-value">{formatNumber(responses.length)}</strong>
          <small className="stat-description">
            Última em {lastDate ? dateFormatter.format(new Date(lastDate)) : "—"}
          </small>
        </div>

        <div className="stat-card">
          <span className="stat-title">Passaram a explicar melhor o ROAS</span>
          <strong className="stat-value">{formatPercent((roas.improved / roas.total) * 100)}</strong>
          <small className="stat-description">
            {roas.improved} de {roas.total} subiram de nível
          </small>
        </div>

        <div className="stat-card">
          <span className="stat-title">"Antes" respondido antes do uso</span>
          <strong className="stat-value">{formatNumber(roas.preUse)}</strong>
          <small className="stat-description">
            {roas.retrospective} responderam o "antes" só no final
          </small>
        </div>
      </div>

      <div className="admin-block">
        <h3>ROAS antes e depois do uso</h3>
        <p className="muted small">{ROAS_QUESTION}</p>

        <div className="chart">
          <ResponsiveContainer width="100%" height={roasChartData.length * 64 + 56}>
            <BarChart
              data={roasChartData}
              layout="vertical"
              barGap={2}
              margin={{ top: 0, right: 56, bottom: 0, left: 4 }}
            >
              <CartesianGrid horizontal={false} stroke="var(--grid)" />
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="label"
                width={170}
                tick={axisTick}
                stroke="var(--axis)"
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value, name, item) => {
                  const row = item.payload as (typeof roasChartData)[number]
                  const count = name === "Antes do uso" ? row.antesCount : row.depoisCount
                  return [`${count} (${formatPercent(Number(value))})`, name]
                }}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="chart-legend-label">{value}</span>
                )}
              />
              <Bar dataKey="antes" name="Antes do uso" fill="var(--series-1)" barSize={18} radius={[0, 4, 4, 0]} minPointSize={2}>
                <LabelList dataKey="antes" position="right" formatter={percentLabel} fill="var(--chart-text)" fontSize={12} />
              </Bar>
              <Bar dataKey="depois" name="Depois do uso" fill="var(--series-2)" barSize={18} radius={[0, 4, 4, 0]} minPointSize={2}>
                <LabelList dataKey="depois" position="right" formatter={percentLabel} fill="var(--chart-text)" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ul className="roas-change">
          <li>
            <strong className="tabular">{roas.improved}</strong> melhoraram
          </li>
          <li>
            <strong className="tabular">{roas.same}</strong> mantiveram o nível
          </li>
          <li>
            <strong className="tabular">{roas.worse}</strong> pioraram
          </li>
        </ul>

        {roas.retrospective > 0 && (
          <p className="muted small">
            Considerando só quem respondeu o "antes" antes de usar a plataforma
            ({roas.preUseOnly.total}): {roas.preUseOnly.improved} melhoraram,{" "}
            {roas.preUseOnly.same} mantiveram e {roas.preUseOnly.worse} pioraram.
            Respostas retrospectivas tendem a ser menos precisas.
          </p>
        )}
      </div>

      <div className="admin-grid">
        {CHOICE_QUESTIONS.map((question, index) => (
          <figure key={question} className="chart">
            <figcaption>
              <h3>
                {index + 1}. {FEEDBACK_QUESTIONS[question].label}
              </h3>
            </figcaption>
            <DistributionChart data={countChoice(responses, question)} />
          </figure>
        ))}
      </div>

      <div className="admin-block">
        <h3>Sugestões e dificuldades descritas ({comments.length})</h3>

        {comments.length === 0 ? (
          <EmptyState icon="message" title="Nenhum comentário escrito ainda">
            As respostas abertas aparecem aqui quando alguém preencher a
            pergunta 7 ou escolher "Outra" na pergunta 6.
          </EmptyState>
        ) : (
          <ul className="comment-list">
            {comments.map((comment) => (
              <li key={comment.id} className="comment">
                <div className="comment-meta">
                  <span className="badge">
                    <span className="badge-dot">
                      <Icon name={comment.kind === "suggestion" ? "lightbulb" : "alertCircle"} />
                    </span>
                    {comment.kind === "suggestion" ? "Sugestão" : "Dificuldade"}
                  </span>
                  <span className="muted small tabular">
                    {dateFormatter.format(new Date(comment.createdAt))}
                  </span>
                </div>
                <p>{comment.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default AdminFeedback
