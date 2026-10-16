-- Analytica: esquema inicial.
--
-- Cria as tabelas de conjuntos de dados importados (datasets) e de campanhas,
-- com Row Level Security: cada usuário autenticado só enxerga e altera os
-- próprios registros. Visitantes anônimos não têm acesso a nada.
--
-- Esta migração só cria objetos novos. Não altera nem apaga dados existentes.

-- Conjuntos de dados ------------------------------------------------------

create table public.datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  source_format text not null
    check (source_format in ('analytica', 'meta', 'google', 'generic', 'sample')),
  created_at timestamptz not null default now()
);

comment on table public.datasets is
  'Arquivos de campanhas importados por cada usuário.';

create index datasets_user_created_idx
  on public.datasets (user_id, created_at desc);

-- Campanhas ----------------------------------------------------------------

create table public.campaigns (
  id bigint generated always as identity primary key,
  dataset_id uuid not null
    references public.datasets (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 300),
  platform text not null check (char_length(platform) between 1 and 100),
  investment numeric(18, 2) not null check (investment >= 0),
  impressions numeric(18, 2) not null check (impressions >= 0),
  clicks numeric(18, 2) not null check (clicks >= 0),
  conversions numeric(18, 2) not null check (conversions >= 0),
  revenue numeric(18, 2) not null check (revenue >= 0),
  created_at timestamptz not null default now()
);

comment on table public.campaigns is
  'Campanhas de cada conjunto de dados importado.';

create index campaigns_dataset_idx on public.campaigns (dataset_id);
create index campaigns_user_idx on public.campaigns (user_id);

-- Permissões ---------------------------------------------------------------
-- Anônimos não acessam as tabelas. Usuários autenticados acessam, mas as
-- políticas abaixo limitam cada um às próprias linhas.

revoke all on public.datasets, public.campaigns from anon;

grant select, insert, update, delete
  on public.datasets, public.campaigns
  to authenticated;

-- Row Level Security -------------------------------------------------------
-- (select auth.uid()) é avaliado uma vez por consulta, e não por linha.

alter table public.datasets enable row level security;
alter table public.campaigns enable row level security;

create policy "datasets: ler os próprios"
  on public.datasets for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "datasets: criar os próprios"
  on public.datasets for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "datasets: alterar os próprios"
  on public.datasets for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "datasets: apagar os próprios"
  on public.datasets for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "campaigns: ler as próprias"
  on public.campaigns for select to authenticated
  using ((select auth.uid()) = user_id);

-- Ao criar ou alterar uma campanha, o dataset também precisa ser do usuário.
-- Isso impede anexar campanhas ao conjunto de dados de outra pessoa.
create policy "campaigns: criar as próprias"
  on public.campaigns for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.datasets d
      where d.id = dataset_id and d.user_id = (select auth.uid())
    )
  );

create policy "campaigns: alterar as próprias"
  on public.campaigns for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.datasets d
      where d.id = dataset_id and d.user_id = (select auth.uid())
    )
  );

create policy "campaigns: apagar as próprias"
  on public.campaigns for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Salvar um conjunto de dados completo ---------------------------------------
-- Cria o dataset e as campanhas em uma única transação: ou tudo é salvo, ou
-- nada é. Roda com as permissões de quem chama (security invoker), então as
-- políticas de RLS acima continuam valendo.

create function public.save_dataset(
  p_name text,
  p_source_format text,
  p_campaigns jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_dataset_id uuid;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_campaigns) is distinct from 'array'
    or jsonb_array_length(p_campaigns) = 0 then
    raise exception 'Envie ao menos uma campanha.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_campaigns) > 5000 then
    raise exception 'Limite de 5000 campanhas por arquivo.' using errcode = '22023';
  end if;

  insert into public.datasets (user_id, name, source_format)
  values (v_user_id, p_name, p_source_format)
  returning id into v_dataset_id;

  insert into public.campaigns (
    dataset_id, user_id, name, platform,
    investment, impressions, clicks, conversions, revenue
  )
  select
    v_dataset_id, v_user_id, c.name, c.platform,
    c.investment, c.impressions, c.clicks, c.conversions, c.revenue
  from jsonb_to_recordset(p_campaigns) as c (
    name text,
    platform text,
    investment numeric,
    impressions numeric,
    clicks numeric,
    conversions numeric,
    revenue numeric
  );

  return v_dataset_id;
end;
$$;

revoke execute on function public.save_dataset (text, text, jsonb)
  from public, anon;

grant execute on function public.save_dataset (text, text, jsonb)
  to authenticated;
