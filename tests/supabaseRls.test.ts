import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { PGlite } from "@electric-sql/pglite"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

// Executa a migração real em um Postgres embutido (PGlite) e verifica as
// políticas de RLS. O ambiente simula o que o Supabase oferece: os papéis
// anon e authenticated, a tabela auth.users, a função auth.uid() (que lê o
// usuário do JWT) e as permissões padrão que o Supabase concede ao schema
// public, para garantir que a migração as restringe.

const readMigration = (name: string) =>
  readFileSync(
    fileURLToPath(new URL(`../supabase/migrations/${name}`, import.meta.url)),
    "utf8"
  )

const MIGRATIONS = [
  readMigration("20261016000000_initial_schema.sql"),
  readMigration("20261016010000_ai_usage.sql"),
  readMigration("20261016020000_revoke_unused_privileges.sql"),
]

const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;

  create schema auth;
  create table auth.users (id uuid primary key);

  create function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;

  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`

const ALICE = "11111111-1111-1111-1111-111111111111"
const BOB = "22222222-2222-2222-2222-222222222222"

const CAMPAIGNS = [
  {
    name: "Black Friday",
    platform: "Meta Ads",
    investment: 2000,
    impressions: 50000,
    clicks: 1250,
    conversions: 83,
    revenue: 8500,
  },
  {
    name: "Remarketing",
    platform: "Google Ads",
    investment: 1200.5,
    impressions: 18000,
    clicks: 950,
    conversions: 76.5,
    revenue: 6200,
  },
]

let db: PGlite

async function asAdmin() {
  await db.exec("reset role")
  await db.query("select set_config('request.jwt.claim.sub', '', false)")
}

async function asUser(userId: string) {
  await db.exec("reset role")
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    userId,
  ])
  await db.exec("set role authenticated")
}

async function asAnon() {
  await asAdmin()
  await db.exec("set role anon")
}

async function saveDataset(
  name: string,
  campaigns: unknown = CAMPAIGNS,
  format = "meta"
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "select public.save_dataset($1, $2, $3::jsonb) as id",
    [name, format, JSON.stringify(campaigns)]
  )

  return rows[0].id
}

async function count(
  table: "datasets" | "campaigns" | "ai_usage"
): Promise<number> {
  const { rows } = await db.query<{ total: number }>(
    `select count(*)::int as total from public.${table}`
  )

  return rows[0].total
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(SUPABASE_SHIM)
  for (const migration of MIGRATIONS) {
    await db.exec(migration)
  }
  await db.query("insert into auth.users (id) values ($1), ($2)", [
    ALICE,
    BOB,
  ])
})

beforeEach(async () => {
  await asAdmin()
  await db.exec("delete from public.datasets")
  await db.exec("delete from public.ai_usage")
})

describe("save_dataset", () => {
  it("salva o dataset e as campanhas do usuário", async () => {
    await asUser(ALICE)
    const id = await saveDataset("meta.csv")

    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(await count("datasets")).toBe(1)
    expect(await count("campaigns")).toBe(2)

    const { rows } = await db.query<{
      user_id: string
      investment: string
      conversions: string
    }>(
      "select user_id, investment::text, conversions::text from public.campaigns order by name desc"
    )

    expect(rows[0]).toEqual({
      user_id: ALICE,
      investment: "1200.50",
      conversions: "76.50",
    })
  })

  it("é atômico: uma campanha inválida impede salvar o arquivo todo", async () => {
    await asUser(ALICE)

    await expect(
      saveDataset("ruim.csv", [
        CAMPAIGNS[0],
        { ...CAMPAIGNS[1], investment: -1 },
      ])
    ).rejects.toThrow()

    expect(await count("datasets")).toBe(0)
    expect(await count("campaigns")).toBe(0)
  })

  it("rejeita lista vazia e formato desconhecido", async () => {
    await asUser(ALICE)

    await expect(saveDataset("vazio.csv", [])).rejects.toThrow(
      /ao menos uma campanha/
    )
    await expect(saveDataset("x.csv", CAMPAIGNS, "excel")).rejects.toThrow()
  })

  it("exige usuário autenticado", async () => {
    await asAdmin()
    await db.exec("set role authenticated")

    await expect(saveDataset("sem-login.csv")).rejects.toThrow(
      /não autenticado/
    )
  })
})

describe("permissões dos papéis", () => {
  const PRIVILEGES = [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "TRUNCATE",
    "REFERENCES",
    "TRIGGER",
  ]

  async function grantedPrivileges(role: string, table: string) {
    const { rows } = await db.query<{ privilege: string }>(
      `select p as privilege
       from unnest($1::text[]) p
       where has_table_privilege($2, $3, p)
       order by array_position($1::text[], p)`,
      [PRIVILEGES, role, `public.${table}`]
    )

    return rows.map((row) => row.privilege)
  }

  it.each(["datasets", "campaigns"])(
    "authenticated tem só select, insert, update e delete em %s",
    async (table) => {
      await asAdmin()

      expect(await grantedPrivileges("authenticated", table)).toEqual([
        "SELECT",
        "INSERT",
        "UPDATE",
        "DELETE",
      ])
    }
  )

  it("authenticated tem só select e insert em ai_usage", async () => {
    await asAdmin()

    expect(await grantedPrivileges("authenticated", "ai_usage")).toEqual([
      "SELECT",
      "INSERT",
    ])
  })

  it.each(["datasets", "campaigns", "ai_usage"])(
    "anon não tem nenhuma permissão em %s",
    async (table) => {
      await asAdmin()

      expect(await grantedPrivileges("anon", table)).toEqual([])
    }
  )

  it("TRUNCATE (que ignoraria o RLS) é negado e não apaga dados de ninguém", async () => {
    await asUser(ALICE)
    await saveDataset("alice.csv")

    await asUser(BOB)
    await expect(
      db.exec("truncate public.campaigns, public.datasets")
    ).rejects.toThrow(/permission denied/)

    await asUser(ALICE)
    expect(await count("datasets")).toBe(1)
    expect(await count("campaigns")).toBe(2)
  })
})

describe("CRUD nos próprios registros", () => {
  it("cria, lê, altera e exclui o próprio dataset e as próprias campanhas", async () => {
    await asUser(ALICE)

    // Criar
    const id = await saveDataset("original.csv")
    await db.query(
      `insert into public.campaigns
        (dataset_id, name, platform, investment, impressions, clicks, conversions, revenue)
       values ($1, 'Extra', 'Google Ads', 10, 100, 5, 1, 30)`,
      [id]
    )

    // Ler
    expect(await count("datasets")).toBe(1)
    expect(await count("campaigns")).toBe(3)

    // Alterar
    const renamed = await db.query(
      "update public.datasets set name = 'renomeado.csv' where id = $1",
      [id]
    )
    const repriced = await db.query(
      "update public.campaigns set revenue = 99 where name = 'Extra'"
    )

    expect(renamed.affectedRows).toBe(1)
    expect(repriced.affectedRows).toBe(1)

    const { rows } = await db.query<{ name: string }>(
      "select name from public.datasets where id = $1",
      [id]
    )
    expect(rows[0].name).toBe("renomeado.csv")

    // Excluir
    const removedCampaign = await db.query(
      "delete from public.campaigns where name = 'Extra'"
    )
    const removedDataset = await db.query(
      "delete from public.datasets where id = $1",
      [id]
    )

    expect(removedCampaign.affectedRows).toBe(1)
    expect(removedDataset.affectedRows).toBe(1)
    expect(await count("datasets")).toBe(0)
    expect(await count("campaigns")).toBe(0)
  })
})

describe("isolamento entre usuários (RLS)", () => {
  let aliceDataset: string

  beforeEach(async () => {
    await asUser(ALICE)
    aliceDataset = await saveDataset("alice.csv")
  })

  it("um usuário não vê os dados de outro", async () => {
    await asUser(BOB)

    expect(await count("datasets")).toBe(0)
    expect(await count("campaigns")).toBe(0)
  })

  it("um usuário não altera os dados de outro", async () => {
    await asUser(BOB)

    const datasets = await db.query(
      "update public.datasets set name = 'invadido' where id = $1",
      [aliceDataset]
    )
    const campaigns = await db.query(
      "update public.campaigns set revenue = 0 where dataset_id = $1",
      [aliceDataset]
    )

    expect(datasets.affectedRows).toBe(0)
    expect(campaigns.affectedRows).toBe(0)

    await asUser(ALICE)
    const { rows } = await db.query<{ name: string }>(
      "select name from public.datasets"
    )
    expect(rows[0].name).toBe("alice.csv")
  })

  it("um usuário não apaga os dados de outro", async () => {
    await asUser(BOB)

    const result = await db.query("delete from public.datasets where id = $1", [
      aliceDataset,
    ])
    expect(result.affectedRows).toBe(0)

    await asUser(ALICE)
    expect(await count("datasets")).toBe(1)
  })

  it("não é possível anexar campanhas ao dataset de outro usuário", async () => {
    await asUser(BOB)

    await expect(
      db.query(
        `insert into public.campaigns
          (dataset_id, name, platform, investment, impressions, clicks, conversions, revenue)
         values ($1, 'Intrusa', 'X', 1, 1, 1, 0, 0)`,
        [aliceDataset]
      )
    ).rejects.toThrow(/row-level security/)
  })

  it("não é possível criar registros em nome de outro usuário", async () => {
    await asUser(BOB)

    await expect(
      db.query(
        "insert into public.datasets (user_id, name, source_format) values ($1, 'falso', 'meta')",
        [ALICE]
      )
    ).rejects.toThrow(/row-level security/)
  })

  it("não é possível transferir um dataset para outro usuário", async () => {
    await asUser(ALICE)

    await expect(
      db.query("update public.datasets set user_id = $1 where id = $2", [
        BOB,
        aliceDataset,
      ])
    ).rejects.toThrow(/row-level security/)
  })

  it("apagar o dataset apaga as campanhas dele", async () => {
    await asUser(ALICE)

    await db.query("delete from public.datasets where id = $1", [aliceDataset])

    expect(await count("datasets")).toBe(0)
    expect(await count("campaigns")).toBe(0)
  })
})

describe("acesso anônimo", () => {
  it("visitantes sem login não leem as tabelas", async () => {
    await asAnon()

    await expect(count("datasets")).rejects.toThrow(/permission denied/)
    await expect(count("campaigns")).rejects.toThrow(/permission denied/)
  })

  it("visitantes sem login não salvam dados", async () => {
    await asAnon()

    await expect(saveDataset("anon.csv")).rejects.toThrow(/permission denied/)
  })
})

describe("ai_usage (limite diário da IA)", () => {
  it("o usuário registra e lê o próprio uso", async () => {
    await asUser(ALICE)

    await db.query("insert into public.ai_usage (user_id) values ($1)", [
      ALICE,
    ])
    await db.query("insert into public.ai_usage default values")

    expect(await count("ai_usage")).toBe(2)
  })

  it("não vê o uso de outros usuários", async () => {
    await asUser(ALICE)
    await db.query("insert into public.ai_usage default values")

    await asUser(BOB)
    expect(await count("ai_usage")).toBe(0)
  })

  it("não registra uso em nome de outro usuário", async () => {
    await asUser(BOB)

    await expect(
      db.query("insert into public.ai_usage (user_id) values ($1)", [ALICE])
    ).rejects.toThrow(/row-level security/)
  })

  it("não apaga nem altera o próprio uso para burlar o limite", async () => {
    await asUser(ALICE)
    await db.query("insert into public.ai_usage default values")

    await expect(db.query("delete from public.ai_usage")).rejects.toThrow(
      /permission denied/
    )
    await expect(
      db.query(
        "update public.ai_usage set created_at = now() - interval '2 days'"
      )
    ).rejects.toThrow(/permission denied/)

    expect(await count("ai_usage")).toBe(1)
  })

  it("visitantes sem login não acessam", async () => {
    await asAnon()

    await expect(count("ai_usage")).rejects.toThrow(/permission denied/)
  })
})
