import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { Campaign, CampaignRow, MetricAvailability } from "../types/campaign"

import { dailySeries } from "../utils/campaignData"
import {
  formatCurrency,
  formatMultiplier,
  formatNumber,
} from "../utils/formatters"
import { METRICS, type MetricKey } from "../utils/metricCatalog"

import { EmptyState, IconTile } from "./ui/primitives"

interface CampaignChartProps {
  campaigns: Campaign[]
  rows: CampaignRow[]
  availability: MetricAvailability
  // Métrica do ranking e da evolução (a do filtro, quando houver).
  metric: MetricKey
}

const MAX_LABEL_LENGTH = 22
const BAR_SIZE = 20

const axisTick = { fill: "var(--chart-text)", fontSize: 12 }

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
})

function formatDay(iso: string): string {
  return dayFormatter.format(new Date(`${iso}T00:00:00Z`))
}

function truncate(label: string): string {
  return label.length > MAX_LABEL_LENGTH
    ? `${label.slice(0, MAX_LABEL_LENGTH - 1)}…`
    : label
}

function labelWidth(campaigns: { name: string }[]): number {
  const longest = Math.max(
    ...campaigns.map((campaign) => truncate(campaign.name).length)
  )

  return Math.min(180, longest * 7 + 12)
}

function chartHeight(rows: number, rowHeight: number): number {
  return Math.max(160, rows * rowHeight + 48)
}

const tooltipStyle = {
  contentStyle: {
    background: "var(--surface-solid)",
    border: "1px solid var(--border-strong)",
    borderRadius: 12,
    color: "var(--text)",
    boxShadow: "var(--shadow-float)",
  },
  labelStyle: { color: "var(--text)", fontWeight: 600 },
  itemStyle: { color: "var(--text)" },
  cursor: { fill: "var(--hover)" },
}

function legendLabel(value: string) {
  return <span className="chart-legend-label">{value}</span>
}

function CampaignChart({ campaigns, rows, availability, metric }: CampaignChartProps) {
  if (campaigns.length === 0) {
    return null
  }

  const width = labelWidth(campaigns)
  const selected = METRICS[metric]

  const roasData = campaigns
    .map((campaign) => ({ name: campaign.name, roas: METRICS.roas.value(campaign) }))
    .filter((item): item is { name: string; roas: number } => item.roas !== null)

  const rankingData = campaigns
    .map((campaign) => ({ name: campaign.name, value: selected.value(campaign) }))
    .filter((item): item is { name: string; value: number } => item.value !== null)
    .sort((a, b) => b.value - a.value)

  const daily = dailySeries(rows, metric).filter((point) => point.value !== null)

  return (
    <section className="panel charts" aria-labelledby="charts-title">
      <div className="section-title">
        <IconTile name="chart" />
        <div>
          <h2 id="charts-title">Comparação entre campanhas</h2>
          <p className="muted small">
            Passe o mouse ou toque nos gráficos para ver os valores exatos. As
            cores de cada métrica são as mesmas dos indicadores.
          </p>
        </div>
      </div>

      <div className="chart-grid">
        <figure className="chart">
          <figcaption>
            <h3>{availability.revenue ? "Investimento x Receita" : "Investimento"}</h3>
            <p className="muted small">
              {availability.revenue
                ? "Barras de receita maiores que as de investimento indicam que a campanha trouxe mais do que custou."
                : "O arquivo não traz receita: só o investimento é mostrado."}
            </p>
          </figcaption>

          <ResponsiveContainer width="100%" height={chartHeight(campaigns.length, availability.revenue ? 56 : 40)}>
            <BarChart
              data={campaigns}
              layout="vertical"
              barGap={2}
              margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
            >
              <CartesianGrid horizontal={false} stroke="var(--grid)" />
              <XAxis type="number" tick={axisTick} stroke="var(--axis)" tickFormatter={(value: number) => formatNumber(value)} />
              <YAxis type="category" dataKey="name" width={width} tick={axisTick} stroke="var(--axis)" tickFormatter={truncate} />
              <Tooltip {...tooltipStyle} formatter={(value) => formatCurrency(Number(value))} />
              <Legend formatter={legendLabel} />
              <Bar dataKey="investment" name="Investimento" fill={METRICS.investment.color} barSize={BAR_SIZE} radius={[0, 4, 4, 0]} />
              {availability.revenue && (
                <Bar dataKey="revenue" name="Receita" fill={METRICS.revenue.color} barSize={BAR_SIZE} radius={[0, 4, 4, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </figure>

        <figure className="chart">
          <figcaption>
            <h3>ROAS por campanha</h3>
            <p className="muted small">
              Receita gerada para cada R$ 1 investido. À esquerda da linha
              tracejada (1x), a campanha não se pagou.
            </p>
          </figcaption>

          {availability.revenue && roasData.length > 0 ? (
            <ResponsiveContainer width="100%" height={chartHeight(roasData.length, 40)}>
              <BarChart data={roasData} layout="vertical" margin={{ top: 20, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid horizontal={false} stroke="var(--grid)" />
                <XAxis type="number" tick={axisTick} stroke="var(--axis)" tickFormatter={(value: number) => `${formatNumber(value)}x`} />
                <YAxis type="category" dataKey="name" width={width} tick={axisTick} stroke="var(--axis)" tickFormatter={truncate} />
                <Tooltip {...tooltipStyle} formatter={(value) => [formatMultiplier(Number(value)), "ROAS"]} />
                <ReferenceLine
                  x={1}
                  stroke="var(--chart-text)"
                  strokeDasharray="4 4"
                  label={{ value: "1x", position: "top", fill: "var(--chart-text)", fontSize: 12 }}
                />
                <Bar dataKey="roas" name="ROAS" fill={METRICS.roas.color} barSize={BAR_SIZE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="target" title="Sem dados de receita">
              O arquivo não traz receita, então o ROAS não pode ser calculado.
            </EmptyState>
          )}
        </figure>

        <figure className="chart">
          <figcaption>
            <h3>Conversões por campanha</h3>
            <p className="muted small">
              Quantas vendas, cadastros ou outras ações cada campanha gerou.
            </p>
          </figcaption>

          {availability.conversions ? (
            <ResponsiveContainer width="100%" height={chartHeight(campaigns.length, 40)}>
              <BarChart data={campaigns} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid horizontal={false} stroke="var(--grid)" />
                <XAxis type="number" tick={axisTick} stroke="var(--axis)" allowDecimals={false} tickFormatter={(value: number) => formatNumber(value)} />
                <YAxis type="category" dataKey="name" width={width} tick={axisTick} stroke="var(--axis)" tickFormatter={truncate} />
                <Tooltip {...tooltipStyle} formatter={(value) => [formatNumber(Number(value)), "Conversões"]} />
                <Bar dataKey="conversions" name="Conversões" fill={METRICS.conversions.color} barSize={BAR_SIZE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="checkCircle" title="Sem dados de conversões">
              O arquivo não traz a coluna de conversões.
            </EmptyState>
          )}
        </figure>

        <figure className="chart chart-wide">
          <figcaption>
            <h3>Ranking: {selected.label}</h3>
            <p className="muted small">
              Campanhas ordenadas pela métrica escolhida no filtro de métrica
              (sem filtro: investimento).
            </p>
          </figcaption>

          {rankingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={chartHeight(rankingData.length, 40)}>
              <BarChart data={rankingData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid horizontal={false} stroke="var(--grid)" />
                <XAxis type="number" tick={axisTick} stroke="var(--axis)" tickFormatter={(value: number) => formatNumber(value)} />
                <YAxis type="category" dataKey="name" width={labelWidth(rankingData)} tick={axisTick} stroke="var(--axis)" tickFormatter={truncate} />
                <Tooltip {...tooltipStyle} formatter={(value) => [selected.format(Number(value)), selected.label]} />
                <Bar dataKey="value" name={selected.label} fill={selected.color} barSize={BAR_SIZE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="chart" title="Sem valores para esta métrica">
              Nenhuma campanha tem dados suficientes para calcular {selected.label}.
            </EmptyState>
          )}
        </figure>

        {daily.length >= 2 && (
          <figure className="chart chart-wide">
            <figcaption>
              <h3>Evolução no período: {selected.label}</h3>
              <p className="muted small">
                Total por dia das campanhas exibidas. Taxas como CTR e CPA são
                calculadas sobre os totais de cada dia.
              </p>
            </figcaption>

            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={daily} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="date" tick={axisTick} stroke="var(--axis)" tickFormatter={formatDay} minTickGap={16} />
                <YAxis tick={axisTick} stroke="var(--axis)" width={72} tickFormatter={(value: number) => formatNumber(value)} />
                <Tooltip
                  {...tooltipStyle}
                  cursor={{ stroke: "var(--axis)" }}
                  labelFormatter={(label) => formatDay(String(label))}
                  formatter={(value) => [selected.format(Number(value)), selected.label]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={selected.label}
                  stroke={selected.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: selected.color, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </figure>
        )}
      </div>
    </section>
  )
}

export default CampaignChart
