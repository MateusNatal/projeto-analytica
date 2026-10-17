import { useEffect, useMemo, useRef, useState } from "react"

import type { Campaign, MetricAvailability } from "../types/campaign"

import {
  campaignKey,
  countActiveFilters,
  EMPTY_FILTERS,
  type DashboardFilters,
  type DateSummary,
} from "../utils/campaignData"
import { ALL_PLATFORMS } from "../utils/dashboardMetrics"
import { formatNumber } from "../utils/formatters"
import { availableMetrics, METRICS, type MetricKey } from "../utils/metricCatalog"

import Icon from "./ui/Icon"
import { Button, IconTile } from "./ui/primitives"

interface FiltersPanelProps {
  filters: DashboardFilters
  onChange: (filters: DashboardFilters) => void
  platforms: string[]
  // Todas as campanhas do arquivo (sem filtros), para a lista de seleção.
  allCampaigns: Campaign[]
  dates: DateSummary
  availability: MetricAvailability
  shownCampaigns: number
}

const dateLabel = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" })

function formatDay(iso: string | null): string {
  return iso ? dateLabel.format(new Date(`${iso}T00:00:00Z`)) : ""
}

// Unidade exibida ao lado do valor mínimo de cada métrica.
const METRIC_UNIT: Partial<Record<MetricKey, string>> = {
  investment: "R$",
  revenue: "R$",
  cpc: "R$",
  cpa: "R$",
  ctr: "%",
  conversionRate: "%",
  roas: "x",
}

function CampaignPicker({
  campaigns,
  selected,
  onChange,
}: {
  campaigns: Campaign[]
  selected: string[]
  onChange: (keys: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const chosen = new Set(selected)

  useEffect(() => {
    if (!open) return

    function close(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }

    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", close)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("pointerdown", close)
      document.removeEventListener("keydown", escape)
    }
  }, [open])

  const term = search.trim().toLowerCase()
  const visible = campaigns.filter(
    (campaign) => !term || campaign.name.toLowerCase().includes(term)
  )

  function toggle(key: string) {
    onChange(chosen.has(key) ? selected.filter((item) => item !== key) : [...selected, key])
  }

  const summary =
    selected.length === 0
      ? "Todas"
      : selected.length === 1
        ? campaigns.find((campaign) => campaignKey(campaign) === selected[0])?.name ?? "1 campanha"
        : `${selected.length} campanhas`

  return (
    <div className="field picker" ref={ref}>
      <span id="picker-label">Campanhas</span>
      <button
        type="button"
        className="picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="picker-label"
        onClick={() => setOpen((value) => !value)}
      >
        <span>{summary}</span>
        <Icon name="chevronDown" />
      </button>

      {open && (
        <div className="picker-popover">
          <input
            type="search"
            className="picker-search"
            placeholder="Buscar campanha"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar campanha"
          />

          <ul className="picker-list" role="listbox" aria-multiselectable="true" aria-labelledby="picker-label">
            {visible.length === 0 && <li className="muted small">Nenhuma campanha encontrada.</li>}
            {visible.map((campaign) => {
              const key = campaignKey(campaign)
              return (
                <li key={key}>
                  <label className="picker-option">
                    <input
                      type="checkbox"
                      checked={chosen.has(key)}
                      onChange={() => toggle(key)}
                    />
                    <span>
                      {campaign.name}
                      <span className="muted small"> · {campaign.platform}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <div className="picker-footer">
            <button type="button" className="link-button" onClick={() => onChange([])}>
              Todas
            </button>
            <button type="button" className="link-button" onClick={() => setOpen(false)}>
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FiltersPanel({
  filters,
  onChange,
  platforms,
  allCampaigns,
  dates,
  availability,
  shownCampaigns,
}: FiltersPanelProps) {
  const active = countActiveFilters(filters)
  const metrics = useMemo(() => availableMetrics(availability), [availability])

  function update(patch: Partial<DashboardFilters>) {
    onChange({ ...filters, ...patch })
  }

  return (
    <section className="panel filters-panel" aria-labelledby="filters-title">
      <div className="panel-header">
        <div className="section-title">
          <IconTile name="filter" />
          <div>
            <h2 id="filters-title">Visão geral e filtros</h2>
            <p className="filters-count" aria-live="polite">
              {formatNumber(shownCampaigns)} de {formatNumber(allCampaigns.length)} campanha(s)
              exibida(s)
              {active > 0 && ` · ${active} filtro(s) ativo(s)`}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          icon="close"
          disabled={active === 0}
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          Limpar filtros
        </Button>
      </div>

      <div className="filters-grid">
        <label className="field">
          Plataforma
          <select
            value={filters.platform}
            onChange={(event) => update({ platform: event.target.value })}
          >
            <option value={ALL_PLATFORMS}>{ALL_PLATFORMS}</option>
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </label>

        {dates.hasDates ? (
          <fieldset className="field period-field">
            <legend>Período</legend>
            <div className="period-inputs">
              <input
                type="date"
                aria-label="Data inicial"
                min={dates.min ?? undefined}
                max={filters.dateTo ?? dates.max ?? undefined}
                value={filters.dateFrom ?? ""}
                onChange={(event) => update({ dateFrom: event.target.value || null })}
              />
              <span className="muted small">até</span>
              <input
                type="date"
                aria-label="Data final"
                min={filters.dateFrom ?? dates.min ?? undefined}
                max={dates.max ?? undefined}
                value={filters.dateTo ?? ""}
                onChange={(event) => update({ dateTo: event.target.value || null })}
              />
            </div>
            <span className="field-hint">
              Dados de {formatDay(dates.min)} a {formatDay(dates.max)}
              {dates.multiDayRows > 0 &&
                ". Linhas que somam vários dias só entram quando o período inteiro delas está selecionado"}
            </span>
          </fieldset>
        ) : (
          <div className="field">
            Período
            <span className="field-static">
              <Icon name="calendar" />
              Este arquivo não tem datas
            </span>
          </div>
        )}

        <CampaignPicker
          campaigns={allCampaigns}
          selected={filters.campaigns}
          onChange={(keys) => update({ campaigns: keys })}
        />

        <fieldset className="field metric-field">
          <legend>Métrica com valor mínimo</legend>
          <div className="metric-inputs">
            <select
              aria-label="Métrica"
              value={filters.metric ?? ""}
              onChange={(event) =>
                update({
                  metric: (event.target.value || null) as MetricKey | null,
                  metricMin: event.target.value ? filters.metricMin : null,
                })
              }
            >
              <option value="">Nenhuma</option>
              {metrics.map((key) => (
                <option key={key} value={key}>
                  {METRICS[key].label}
                </option>
              ))}
            </select>

            <div className="metric-min">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                aria-label="Valor mínimo"
                placeholder="mín."
                disabled={!filters.metric}
                value={filters.metricMin ?? ""}
                onChange={(event) => {
                  const value = event.target.valueAsNumber
                  update({ metricMin: Number.isFinite(value) ? value : null })
                }}
              />
              {filters.metric && METRIC_UNIT[filters.metric] && (
                <span className="muted small">{METRIC_UNIT[filters.metric]}</span>
              )}
            </div>
          </div>
          <span className="field-hint">
            Mostra só campanhas com o total do período igual ou acima do valor.
          </span>
        </fieldset>
      </div>
    </section>
  )
}

export default FiltersPanel
