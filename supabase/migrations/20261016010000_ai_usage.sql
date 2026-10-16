-- Analytica: registro de uso da análise com IA.
--
-- Cada chamada à função /api/insights grava uma linha aqui, com o token do
-- próprio usuário. A função conta as linhas das últimas 24 horas para aplicar
-- um limite diário por usuário e controlar o custo da API.
--
-- Não há políticas de update nem de delete: o usuário não consegue apagar o
-- próprio histórico de uso para contornar o limite.
--
-- Esta migração só cria objetos novos. Não altera nem apaga dados existentes.

create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.ai_usage is
  'Uma linha por análise com IA solicitada, para o limite diário por usuário.';

create index ai_usage_user_created_idx
  on public.ai_usage (user_id, created_at desc);

revoke all on public.ai_usage from anon;
revoke all on public.ai_usage from authenticated;
grant select, insert on public.ai_usage to authenticated;

alter table public.ai_usage enable row level security;

create policy "ai_usage: ler o próprio"
  on public.ai_usage for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "ai_usage: registrar o próprio"
  on public.ai_usage for insert to authenticated
  with check ((select auth.uid()) = user_id);
