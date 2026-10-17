import type { SupabaseClient } from "@supabase/supabase-js"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  DatasetServiceError,
  deleteDataset,
  listDatasets,
  loadDatasetCampaigns,
  fromAvailability,
  mapCampaignRow,
  PAGE_SIZE,
  saveDataset,
  toAvailability,
} from "../src/services/datasetService"

import { makeCampaign } from "./helpers"

type Result = { data: unknown; error: { message: string } | null }

// Cliente falso que registra as chamadas e devolve o resultado configurado.
function fakeClient(result: Result) {
  const calls: { method: string; args: unknown[] }[] = []

  const builder: Record<string, unknown> = {}

  for (const method of ["select", "order", "limit", "eq", "delete", "range"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    }
  }

  builder.then = (resolve: (value: Result) => unknown) => resolve(result)

  const client = {
    from: (table: string) => {
      calls.push({ method: "from", args: [table] })
      return builder
    },
    rpc: async (fn: string, params: unknown) => {
      calls.push({ method: "rpc", args: [fn, params] })
      return result
    },
  }

  return { client: client as unknown as SupabaseClient, calls }
}

// O cliente lê as variáveis ao carregar o módulo; por isso cada teste define
// o próprio ambiente e reimporta o arquivo, sem depender da máquina em que
// roda (na Vercel, as variáveis do Supabase existem).
async function loadSupabaseClient(url: string, key: string) {
  vi.stubEnv("VITE_SUPABASE_URL", url)
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", key)
  vi.resetModules()

  return import("../src/services/supabaseClient")
}

describe("supabaseClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("sem variáveis de ambiente, o app roda sem Supabase", async () => {
    const client = await loadSupabaseClient("", "")

    expect(client.isSupabaseConfigured).toBe(false)
    expect(client.supabase).toBeNull()
  })

  it("com as variáveis, cria o cliente", async () => {
    const client = await loadSupabaseClient(
      "https://exemplo.supabase.co",
      "chave-publica-de-teste"
    )

    expect(client.isSupabaseConfigured).toBe(true)
    expect(client.supabase).not.toBeNull()
  })
})

describe("mapCampaignRow", () => {
  it("converte colunas numeric que chegam como texto", () => {
    expect(
      mapCampaignRow(
        {
          id: 99,
          name: "A",
          platform: "Meta Ads",
          investment: "1200.50",
          impressions: "18000.00",
          clicks: 950,
          conversions: "76.50",
          revenue: 6200,
        },
        0
      )
    ).toEqual({
      id: 1,
      name: "A",
      platform: "Meta Ads",
      investment: 1200.5,
      impressions: 18000,
      clicks: 950,
      conversions: 76.5,
      revenue: 6200,
      dateStart: null,
      dateEnd: null,
    })
  })
})

describe("listDatasets", () => {
  it("lista os arquivos mais recentes com a contagem de campanhas", async () => {
    const { client, calls } = fakeClient({
      data: [
        {
          id: "d1",
          name: "meta.csv",
          source_format: "meta",
          created_at: "2026-10-16T12:00:00Z",
          available_fields: ["conversions"],
          campaigns: [{ count: 3 }],
        },
      ],
      error: null,
    })

    expect(await listDatasets(client)).toEqual([
      {
        id: "d1",
        name: "meta.csv",
        sourceFormat: "meta",
        createdAt: "2026-10-16T12:00:00Z",
        campaignCount: 3,
        availability: { conversions: true, revenue: false },
      },
    ])

    expect(calls[0]).toEqual({ method: "from", args: ["datasets"] })
    expect(calls).toContainEqual({
      method: "order",
      args: ["created_at", { ascending: false }],
    })
  })
})

describe("loadDatasetCampaigns", () => {
  it("busca só as campanhas do dataset pedido", async () => {
    const { client, calls } = fakeClient({ data: [], error: null })

    await loadDatasetCampaigns(client, "d1")

    expect(calls).toContainEqual({ method: "eq", args: ["dataset_id", "d1"] })
  })
})

describe("saveDataset", () => {
  it("envia as campanhas sem ids para a função save_dataset", async () => {
    const { client, calls } = fakeClient({ data: "novo-id", error: null })

    const id = await saveDataset(
      client,
      "tiktok.csv",
      "tiktok",
      [
        { ...makeCampaign({ id: 42, name: "A" }), dateStart: "2026-10-01", dateEnd: null },
      ],
      { conversions: true, revenue: false }
    )

    expect(id).toBe("novo-id")
    expect(calls[0]).toEqual({
      method: "rpc",
      args: [
        "save_dataset_v2",
        {
          p_name: "tiktok.csv",
          p_source_format: "tiktok",
          p_campaigns: [
            {
              name: "A",
              platform: "Meta Ads",
              investment: 1000,
              impressions: 50000,
              clicks: 1000,
              conversions: 50,
              revenue: 4000,
              report_date: "2026-10-01",
              report_end_date: null,
            },
          ],
          // Só as métricas opcionais que o arquivo trazia.
          p_available_fields: ["conversions"],
        },
      ],
    })
  })

  it("limita o nome a 200 caracteres", async () => {
    const { client, calls } = fakeClient({ data: "id", error: null })

    await saveDataset(
      client,
      "a".repeat(300),
      "generic",
      [{ ...makeCampaign(), dateStart: null, dateEnd: null }],
      { conversions: true, revenue: true }
    )

    const params = calls[0].args[1] as { p_name: string }
    expect(params.p_name).toHaveLength(200)
  })
})

describe("disponibilidade das métricas", () => {
  it("arquivo salvo antes do registro (nulo) é tratado como completo", () => {
    expect(toAvailability(null)).toEqual({ conversions: true, revenue: true })
  })

  it("converte nos dois sentidos", () => {
    expect(toAvailability(["revenue"])).toEqual({ conversions: false, revenue: true })
    expect(fromAvailability({ conversions: false, revenue: true })).toEqual(["revenue"])
    expect(fromAvailability({ conversions: false, revenue: false })).toEqual([])
  })
})

describe("loadDatasetCampaigns em páginas", () => {
  it("busca páginas de 1000 linhas até a última", async () => {
    const pages = [PAGE_SIZE, PAGE_SIZE, 3]
    const ranges: unknown[][] = []
    let call = 0
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      range: (...args: unknown[]) => {
        ranges.push(args)
        const size = pages[call++]
        const rows = Array.from({ length: size }, (_, i) => ({
          id: i, name: "C", platform: "TikTok Ads", investment: "1", impressions: "10",
          clicks: "1", conversions: "0", revenue: "0", report_date: "2026-10-01", report_end_date: null,
        }))
        return Promise.resolve({ data: rows, error: null })
      },
    }
    const client = { from: () => builder } as unknown as SupabaseClient

    const rows = await loadDatasetCampaigns(client, "d1")

    expect(rows).toHaveLength(PAGE_SIZE * 2 + 3)
    expect(ranges).toEqual([
      [0, PAGE_SIZE - 1],
      [PAGE_SIZE, PAGE_SIZE * 2 - 1],
      [PAGE_SIZE * 2, PAGE_SIZE * 3 - 1],
    ])
    expect(rows[0]).toMatchObject({ dateStart: "2026-10-01", dateEnd: null, investment: 1 })
  })
})

describe("erros", () => {
  it("mostram mensagem amigável sem expor detalhes técnicos", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const { client } = fakeClient({
      data: null,
      error: { message: 'new row violates row-level security policy for table "datasets"' },
    })

    const attempt = deleteDataset(client, "d1")

    await expect(attempt).rejects.toBeInstanceOf(DatasetServiceError)
    await expect(attempt).rejects.toThrow(
      "Não foi possível excluir o arquivo. Tente novamente em alguns instantes."
    )
    await expect(attempt).rejects.not.toThrow(/row-level/)
    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })
})
