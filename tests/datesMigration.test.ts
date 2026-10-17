import type { PGlite } from "@electric-sql/pglite"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import { actAsAdmin, actAsAnon, actAsUser, createSupabaseDb } from "./supabaseShim"

// Migração 20261018000000: datas por linha, métricas disponíveis e TikTok.
// Dados fictícios.

const ALICE = "11111111-1111-1111-1111-111111111111"
const BOB = "22222222-2222-2222-2222-222222222222"

const ROWS = [
  { name: "A", platform: "TikTok Ads", investment: 10, impressions: 100, clicks: 5, conversions: 1, revenue: 0, report_date: "2026-10-01", report_end_date: null },
  { name: "A", platform: "TikTok Ads", investment: 12, impressions: 120, clicks: 6, conversions: 2, revenue: 0, report_date: "2026-10-02", report_end_date: null },
  { name: "B", platform: "Meta Ads", investment: 50, impressions: 900, clicks: 30, conversions: 3, revenue: 0, report_date: "2026-10-01", report_end_date: "2026-10-07" },
]

let db: PGlite

async function saveV2(rows: unknown = ROWS, fields: string[] = ["conversions"], format = "tiktok") {
  const { rows: result } = await db.query<{ id: string }>(
    "select public.save_dataset_v2($1, $2, $3::jsonb, $4::text[]) as id",
    ["tiktok.csv", format, JSON.stringify(rows), fields]
  )
  return result[0].id
}

beforeAll(async () => {
  db = await createSupabaseDb([ALICE, BOB])
})

beforeEach(async () => {
  await actAsAdmin(db)
  await db.exec("delete from public.datasets")
})

describe("save_dataset_v2", () => {
  it("salva as datas de cada linha e as métricas disponíveis", async () => {
    await actAsUser(db, ALICE)
    const id = await saveV2()

    const datasets = await db.query<{ source_format: string; available_fields: string[] }>(
      "select source_format, available_fields from public.datasets where id = $1",
      [id]
    )
    const campaigns = await db.query<{ report_date: string | null; report_end_date: string | null }>(
      "select to_char(report_date, 'YYYY-MM-DD') as report_date, to_char(report_end_date, 'YYYY-MM-DD') as report_end_date from public.campaigns where dataset_id = $1 order by id",
      [id]
    )

    expect(datasets.rows[0]).toEqual({ source_format: "tiktok", available_fields: ["conversions"] })
    expect(campaigns.rows).toEqual([
      { report_date: "2026-10-01", report_end_date: null },
      { report_date: "2026-10-02", report_end_date: null },
      { report_date: "2026-10-01", report_end_date: "2026-10-07" },
    ])
  })

  it("rejeita métricas desconhecidas e períodos invertidos, sem salvar nada", async () => {
    await actAsUser(db, ALICE)

    await expect(saveV2(ROWS, ["clicks"])).rejects.toThrow()
    await expect(
      saveV2([{ ...ROWS[0], report_date: "2026-10-05", report_end_date: "2026-10-01" }])
    ).rejects.toThrow()
    await expect(saveV2(ROWS, [], "excel")).rejects.toThrow()

    await actAsAdmin(db)
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from public.datasets")
    expect(rows[0].n).toBe(0)
  })

  it("continua isolando os dados entre usuários", async () => {
    await actAsUser(db, ALICE)
    await saveV2()

    await actAsUser(db, BOB)
    const { rows } = await db.query("select * from public.campaigns")
    expect(rows).toHaveLength(0)
  })

  it("visitante sem login não usa a função", async () => {
    await actAsAnon(db)

    await expect(saveV2()).rejects.toThrow(/permission denied/)
  })

  it("a função antiga continua funcionando, com as colunas novas vazias", async () => {
    await actAsUser(db, ALICE)

    const { rows } = await db.query<{ id: string }>(
      "select public.save_dataset('antigo.csv', 'meta', $1::jsonb) as id",
      [JSON.stringify([{ name: "A", platform: "Meta Ads", investment: 1, impressions: 1, clicks: 1, conversions: 0, revenue: 0 }])]
    )
    const saved = await db.query<{ available_fields: string[] | null; report_date: string | null }>(
      "select d.available_fields, c.report_date from public.datasets d join public.campaigns c on c.dataset_id = d.id where d.id = $1",
      [rows[0].id]
    )

    expect(saved.rows[0]).toEqual({ available_fields: null, report_date: null })
  })
})
