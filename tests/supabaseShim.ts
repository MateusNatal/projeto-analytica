import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { PGlite } from "@electric-sql/pglite"

// Simula o que o Supabase oferece para rodar as migrações reais num Postgres
// embutido: papéis anon e authenticated, auth.users, auth.uid() (que lê o
// usuário do JWT) e as permissões padrão que o Supabase concede ao schema
// public, para garantir que as migrações as restringem.
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

const MIGRATIONS_DIR = fileURLToPath(
  new URL("../supabase/migrations/", import.meta.url)
)

// Todas as migrações, na ordem do nome (prefixo de data).
export function readAllMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(`${MIGRATIONS_DIR}${file}`, "utf8"))
}

export async function createSupabaseDb(userIds: string[]): Promise<PGlite> {
  const db = new PGlite()
  await db.exec(SUPABASE_SHIM)

  for (const migration of readAllMigrations()) {
    await db.exec(migration)
  }

  for (const id of userIds) {
    await db.query("insert into auth.users (id) values ($1)", [id])
  }

  return db
}

export async function actAsAdmin(db: PGlite) {
  await db.exec("reset role")
  await db.query("select set_config('request.jwt.claim.sub', '', false)")
}

export async function actAsUser(db: PGlite, userId: string) {
  await db.exec("reset role")
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    userId,
  ])
  await db.exec("set role authenticated")
}

export async function actAsAnon(db: PGlite) {
  await actAsAdmin(db)
  await db.exec("set role anon")
}
