import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import {
  DatasetServiceError,
  deleteDataset,
  listDatasets,
  loadDatasetCampaigns,
  mapCampaignRow,
  saveDataset,
} from "../src/services/datasetService"
import { isSupabaseConfigured, supabase } from "../src/services/supabaseClient"

import { makeCampaign } from "./helpers"

type Result = { data: unknown; error: { message: string } | null }

// Cliente falso que registra as chamadas e devolve o resultado configurado.
function fakeClient(result: Result) {
  const calls: { method: string; args: unknown[] }[] = []

  const builder: Record<string, unknown> = {}

  for (const method of ["select", "order", "limit", "eq", "delete"]) {
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

describe("supabaseClient", () => {
  it("sem variáveis de ambiente, o app roda sem Supabase", () => {
    expect(isSupabaseConfigured).toBe(false)
    expect(supabase).toBeNull()
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

    const id = await saveDataset(client, "meta.csv", "meta", [
      makeCampaign({ id: 42, name: "A" }),
    ])

    expect(id).toBe("novo-id")
    expect(calls[0]).toEqual({
      method: "rpc",
      args: [
        "save_dataset",
        {
          p_name: "meta.csv",
          p_source_format: "meta",
          p_campaigns: [
            {
              name: "A",
              platform: "Meta Ads",
              investment: 1000,
              impressions: 50000,
              clicks: 1000,
              conversions: 50,
              revenue: 4000,
            },
          ],
        },
      ],
    })
  })

  it("limita o nome a 200 caracteres", async () => {
    const { client, calls } = fakeClient({ data: "id", error: null })

    await saveDataset(client, "a".repeat(300), "generic", [makeCampaign()])

    const params = calls[0].args[1] as { p_name: string }
    expect(params.p_name).toHaveLength(200)
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
