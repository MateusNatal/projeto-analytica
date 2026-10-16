import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { Campaign } from "../types/campaign"

import {
  formatCurrency,
  formatMultiplier,
  formatNumber,
} from "../utils/formatters"
import { calculateROAS } from "../utils/metrics"

interface CampaignChartProps {
  campaigns: Campaign[]
}

const MAX_LABEL_LENGTH = 22
const BAR_SIZE = 20

const axisTick = { fill: "var(--text-secondary)", fontSize: 12 }

function truncate(label: string): string {
  return label.length > MAX_LABEL_LENGTH
    ? `${label.slice(0, MAX_LABEL_LENGTH - 1)}…`
    : label
}

function labelWidth(campaigns: Campaign[]): number {
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
    background: "var(--surface-raised)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text-primary)",
  },
  labelStyle: { color: "var(--text-primary)", fontWeight: 600 },
  itemStyle: { color: "var(--text-primary)" },
  cursor: { fill: "var(--hover)" },
}

function CampaignChart({ campaigns }: CampaignChartProps) {
  if (campaigns.length === 0) {
    return null
  }

  const width = labelWidth(campaigns)

  const roasData = campaigns
    .map((campaign) => ({
      name: campaign.name,
      roas: calculateROAS(campaign),
    }))
    .filter((item): item is { name: string; roas: number } =>
      item.roas !== null
    )

  const hasRevenue = campaigns.some((campaign) => campaign.revenue > 0)

  return (
    <section className="panel charts">
      <h2>Comparação entre campanhas</h2>

      <div className="chart-grid">
        <figure className="chart">
          <figcaption>
            <h3>Investimento x Receita</h3>
            <p className="muted small">
              Barras de receita maiores que as de investimento indicam que a
              campanha trouxe mais do que custou.
            </p>
          </figcaption>

          <ResponsiveContainer
            width="100%"
            height={chartHeight(campaigns.length, 56)}
          >
            <BarChart
              data={campaigns}
              layout="vertical"
              barGap={2}
              margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
            >
              <CartesianGrid horizontal={false} stroke="var(--grid)" />

              <XAxis
                type="number"
                tick={axisTick}
                stroke="var(--axis)"
                tickFormatter={(value: number) => formatNumber(value)}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={width}
                tick={axisTick}
                stroke="var(--axis)"
                tickFormatter={truncate}
              />

              <Tooltip
                {...tooltipStyle}
                formatter={(value) => formatCurrency(Number(value))}
              />

              <Legend
                formatter={(value: string) => (
                  <span className="chart-legend-label">{value}</span>
                )}
              />

              <Bar
                dataKey="investment"
                name="Investimento"
                fill="var(--series-1)"
                barSize={BAR_SIZE}
                radius={[0, 4, 4, 0]}
              />

              <Bar
                dataKey="revenue"
                name="Receita"
                fill="var(--series-2)"
                barSize={BAR_SIZE}
                radius={[0, 4, 4, 0]}
              />
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

          {hasRevenue ? (
            <ResponsiveContainer
              width="100%"
              height={chartHeight(roasData.length, 40)}
            >
              <BarChart
                data={roasData}
                layout="vertical"
                margin={{ top: 20, right: 16, bottom: 4, left: 4 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--grid)" />

                <XAxis
                  type="number"
                  tick={axisTick}
                  stroke="var(--axis)"
                  tickFormatter={(value: number) => `${formatNumber(value)}x`}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={width}
                  tick={axisTick}
                  stroke="var(--axis)"
                  tickFormatter={truncate}
                />

                <Tooltip
                  {...tooltipStyle}
                  formatter={(value) => [
                    formatMultiplier(Number(value)),
                    "ROAS",
                  ]}
                />

                <ReferenceLine
                  x={1}
                  stroke="var(--text-secondary)"
                  strokeDasharray="4 4"
                  label={{
                    value: "1x",
                    position: "top",
                    fill: "var(--text-secondary)",
                    fontSize: 12,
                  }}
                />

                <Bar
                  dataKey="roas"
                  name="ROAS"
                  fill="var(--series-1)"
                  barSize={BAR_SIZE}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-state">
              Sem dados de receita para calcular o ROAS.
            </p>
          )}
        </figure>

        <figure className="chart">
          <figcaption>
            <h3>Conversões por campanha</h3>
            <p className="muted small">
              Quantas vendas, cadastros ou outras ações cada campanha gerou.
            </p>
          </figcaption>

          <ResponsiveContainer
            width="100%"
            height={chartHeight(campaigns.length, 40)}
          >
            <BarChart
              data={campaigns}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
            >
              <CartesianGrid horizontal={false} stroke="var(--grid)" />

              <XAxis
                type="number"
                tick={axisTick}
                stroke="var(--axis)"
                allowDecimals={false}
                tickFormatter={(value: number) => formatNumber(value)}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={width}
                tick={axisTick}
                stroke="var(--axis)"
                tickFormatter={truncate}
              />

              <Tooltip
                {...tooltipStyle}
                formatter={(value) => [
                  formatNumber(Number(value)),
                  "Conversões",
                ]}
              />

              <Bar
                dataKey="conversions"
                name="Conversões"
                fill="var(--series-1)"
                barSize={BAR_SIZE}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </figure>
      </div>
    </section>
  )
}

export default CampaignChart
