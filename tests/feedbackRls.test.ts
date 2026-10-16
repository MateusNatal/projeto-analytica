import type { PGlite } from "@electric-sql/pglite"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import {
  actAsAdmin,
  actAsAnon,
  actAsUser,
  createSupabaseDb,
} from "./supabaseShim"

// Dados fictícios, usados só nestes testes.
const ADMIN = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const USER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

let respondentCounter = 0

function respondentId(): string {
  respondentCounter++
  return `00000000-0000-4000-8000-${String(respondentCounter).padStart(12, "0")}`
}

function validAnswers(overrides: Record<string, unknown> = {}) {
  return {
    respondent_id: respondentId(),
    knowledge_level: "basic",
    ease_of_use: "easy",
    indicators_understood: "most",
    ai_helpfulness: "very",
    decision_ready: "yes",
    main_difficulty: "none",
    main_difficulty_other: null,
    suggestions: "Teste automatizado (dado fictício).",
    roas_before: "cannot",
    roas_after: "can_explain",
    roas_before_source: "pre_use",
    roas_before_answered_at: "2026-10-17T10:00:00Z",
    ...overrides,
  }
}

async function submit(db: PGlite, answers = validAnswers()) {
  const columns = Object.keys(answers)
  const placeholders = columns.map((_, index) => `$${index + 1}`)

  return db.query(
    `insert into public.feedback_responses (${columns.join(", ")})
     values (${placeholders.join(", ")})`,
    Object.values(answers)
  )
}

async function countAsOwner(db: PGlite): Promise<number> {
  await actAsAdmin(db)
  const { rows } = await db.query<{ total: number }>(
    "select count(*)::int as total from public.feedback_responses"
  )
  return rows[0].total
}

let db: PGlite

beforeAll(async () => {
  db = await createSupabaseDb([ADMIN, USER])
  await db.query("insert into public.admin_users (user_id) values ($1)", [
    ADMIN,
  ])
})

beforeEach(async () => {
  await actAsAdmin(db)
  await db.exec("delete from public.feedback_responses")
})

describe("envio de avaliações", () => {
  it("visitante sem login envia uma avaliação válida", async () => {
    await actAsAnon(db)
    await submit(db)

    expect(await countAsOwner(db)).toBe(1)
  })

  it("usuário logado também envia, sem o id dele ser gravado", async () => {
    await actAsUser(db, USER)
    await submit(db)

    await actAsAdmin(db)
    const { rows } = await db.query<{ columns: string }>(
      `select string_agg(column_name, ',') as columns
       from information_schema.columns
       where table_schema = 'public' and table_name = 'feedback_responses'`
    )

    expect(rows[0].columns).not.toMatch(/user_id|email|name/)
    expect(await countAsOwner(db)).toBe(1)
  })

  it.each([
    ["opção inexistente", { knowledge_level: "expert" }],
    ["resposta obrigatória vazia", { ease_of_use: null }],
    ["ROAS depois inválido", { roas_after: "sei" }],
    ["'Outra' sem explicação", { main_difficulty: "other", main_difficulty_other: " " }],
    ["explicação sem 'Outra'", { main_difficulty: "import", main_difficulty_other: "x" }],
    ["sugestão longa demais", { suggestions: "a".repeat(2001) }],
    ["pre_use sem data", { roas_before_answered_at: null }],
    ["retrospectiva com data", { roas_before_source: "retrospective" }],
  ])("rejeita %s", async (_label, overrides) => {
    await actAsAnon(db)

    await expect(submit(db, validAnswers(overrides))).rejects.toThrow()
    expect(await countAsOwner(db)).toBe(0)
  })

  it("aceita 'Outra' com explicação e resposta retrospectiva", async () => {
    await actAsAnon(db)
    await submit(
      db,
      validAnswers({
        main_difficulty: "other",
        main_difficulty_other: "Explicação fictícia",
        roas_before_source: "retrospective",
        roas_before_answered_at: null,
      })
    )

    expect(await countAsOwner(db)).toBe(1)
  })

  it("não deixa forjar a data de envio nem o id", async () => {
    await actAsAnon(db)

    await expect(
      db.query(
        `insert into public.feedback_responses
          (created_at, respondent_id, knowledge_level, ease_of_use, indicators_understood,
           ai_helpfulness, decision_ready, main_difficulty, roas_before, roas_after,
           roas_before_source)
         values ('2020-01-01', $1, 'basic', 'easy', 'most', 'very', 'yes', 'none',
                 'cannot', 'vague', 'retrospective')`,
        [respondentId()]
      )
    ).rejects.toThrow(/permission denied/)
  })

  it("o mesmo navegador não envia duas vezes", async () => {
    const answers = validAnswers()

    await actAsAnon(db)
    await submit(db, answers)

    await expect(submit(db, { ...answers })).rejects.toThrow(/duplicate key/)
  })

  it("limita envios em massa a 30 por minuto", async () => {
    await actAsAnon(db)

    for (let i = 0; i < 30; i++) {
      await submit(db)
    }

    await expect(submit(db)).rejects.toThrow(/Muitas avaliações/)
    expect(await countAsOwner(db)).toBe(30)
  })
})

describe("leitura protegida", () => {
  beforeEach(async () => {
    await actAsAnon(db)
    await submit(db)
  })

  it("visitante sem login não lê as avaliações", async () => {
    await actAsAnon(db)

    await expect(
      db.query("select * from public.feedback_responses")
    ).rejects.toThrow(/permission denied/)
  })

  it("usuário logado que não é admin não vê nenhuma avaliação", async () => {
    await actAsUser(db, USER)

    const { rows } = await db.query("select * from public.feedback_responses")
    expect(rows).toHaveLength(0)
  })

  it("usuário comum não apaga nem altera avaliações", async () => {
    await actAsUser(db, USER)

    const removed = await db.query("delete from public.feedback_responses")
    expect(removed.affectedRows).toBe(0)

    await expect(
      db.query("update public.feedback_responses set suggestions = 'x'")
    ).rejects.toThrow(/permission denied/)

    expect(await countAsOwner(db)).toBe(1)
  })

  it("administrador lê e apaga as avaliações", async () => {
    await actAsUser(db, ADMIN)

    const { rows } = await db.query("select * from public.feedback_responses")
    expect(rows).toHaveLength(1)

    const removed = await db.query("delete from public.feedback_responses")
    expect(removed.affectedRows).toBe(1)
  })

  it("nem o administrador altera respostas pelo site", async () => {
    await actAsUser(db, ADMIN)

    await expect(
      db.query("update public.feedback_responses set roas_after = 'cannot'")
    ).rejects.toThrow(/permission denied/)
  })
})

describe("is_admin e admin_users", () => {
  it("is_admin diz a verdade para cada usuário", async () => {
    await actAsUser(db, ADMIN)
    const admin = await db.query<{ ok: boolean }>("select public.is_admin() as ok")

    await actAsUser(db, USER)
    const user = await db.query<{ ok: boolean }>("select public.is_admin() as ok")

    expect(admin.rows[0].ok).toBe(true)
    expect(user.rows[0].ok).toBe(false)
  })

  it("visitante sem login não chama is_admin", async () => {
    await actAsAnon(db)

    await expect(db.query("select public.is_admin()")).rejects.toThrow(
      /permission denied/
    )
  })

  it("ninguém se promove a administrador pelo site", async () => {
    await actAsUser(db, USER)

    await expect(
      db.query("insert into public.admin_users (user_id) values ($1)", [USER])
    ).rejects.toThrow(/permission denied/)
    await expect(db.query("select * from public.admin_users")).rejects.toThrow(
      /permission denied/
    )
  })
})
