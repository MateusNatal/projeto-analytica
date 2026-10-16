-- Analytica: avaliações da plataforma (aba "Feedback") e área administrativa.
--
-- Qualquer visitante pode ENVIAR uma avaliação, com ou sem login, e sem
-- informar dados pessoais: não há nome, e-mail nem id de usuário na tabela.
-- Apenas administradores podem LER ou APAGAR as avaliações.
--
-- Esta migração só cria objetos novos. Não altera nem apaga dados existentes.

-- Administradores -----------------------------------------------------------
-- Só pode ser alterada pelo painel do Supabase (SQL Editor), nunca pelo site:
-- não há políticas de RLS para anon ou authenticated nesta tabela.

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Usuários com acesso à área administrativa. Gerenciada só pelo painel do Supabase.';

revoke all on public.admin_users from anon, authenticated;
alter table public.admin_users enable row level security;

-- Diz se o usuário logado é administrador. Roda com os privilégios do dono
-- (security definer) para consultar admin_users sem expor a tabela.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Avaliações ----------------------------------------------------------------

create table public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Identificador aleatório gerado no navegador, só para evitar envios
  -- repetidos. Não identifica a pessoa.
  respondent_id uuid not null unique,

  knowledge_level text not null
    check (knowledge_level in ('none', 'basic', 'intermediate', 'advanced')),
  ease_of_use text not null
    check (ease_of_use in ('very_hard', 'hard', 'neutral', 'easy', 'very_easy')),
  indicators_understood text not null
    check (indicators_understood in ('none', 'few', 'most', 'all')),
  ai_helpfulness text not null
    check (ai_helpfulness in ('not_helpful', 'slightly', 'moderately', 'very', 'not_used')),
  decision_ready text not null
    check (decision_ready in ('no', 'maybe_with_help', 'yes')),
  main_difficulty text not null
    check (main_difficulty in ('import', 'indicators', 'ai_analysis', 'navigation', 'none', 'other')),
  main_difficulty_other text
    check (main_difficulty_other is null or char_length(main_difficulty_other) <= 500),
  suggestions text
    check (suggestions is null or char_length(suggestions) <= 2000),

  -- "Você consegue explicar o que significa o ROAS?" antes e depois do uso.
  roas_before text not null
    check (roas_before in ('cannot', 'vague', 'can_explain')),
  roas_after text not null
    check (roas_after in ('cannot', 'vague', 'can_explain')),
  -- pre_use: respondida antes de usar a plataforma (no primeiro acesso).
  -- retrospective: respondida só no formulário final, lembrando de antes.
  roas_before_source text not null
    check (roas_before_source in ('pre_use', 'retrospective')),
  roas_before_answered_at timestamptz,

  -- "Outra" exige a explicação; as demais opções não a aceitam.
  constraint feedback_other_difficulty_explained check (
    (main_difficulty = 'other')
      = (main_difficulty_other is not null and char_length(btrim(main_difficulty_other)) > 0)
  ),
  -- A data da resposta "antes" só existe quando ela foi dada antes do uso.
  constraint feedback_pre_use_has_time check (
    (roas_before_source = 'pre_use') = (roas_before_answered_at is not null)
  )
);

comment on table public.feedback_responses is
  'Avaliações anônimas da plataforma enviadas pela aba Feedback.';

create index feedback_responses_created_idx
  on public.feedback_responses (created_at desc);

-- Permissões ----------------------------------------------------------------
-- Envio: só as colunas das respostas. id e created_at são sempre do banco,
-- então ninguém consegue forjar a data de uma avaliação.

revoke all on public.feedback_responses from anon, authenticated;

grant insert (
  respondent_id,
  knowledge_level,
  ease_of_use,
  indicators_understood,
  ai_helpfulness,
  decision_ready,
  main_difficulty,
  main_difficulty_other,
  suggestions,
  roas_before,
  roas_after,
  roas_before_source,
  roas_before_answered_at
) on public.feedback_responses to anon, authenticated;

-- Leitura e exclusão (limpeza de testes): concedidas ao authenticated, mas as
-- políticas abaixo liberam só para administradores.
grant select, delete on public.feedback_responses to authenticated;

alter table public.feedback_responses enable row level security;

create policy "feedback: qualquer pessoa envia"
  on public.feedback_responses for insert to anon, authenticated
  with check (true);

create policy "feedback: administradores leem"
  on public.feedback_responses for select to authenticated
  using ((select public.is_admin()));

create policy "feedback: administradores apagam"
  on public.feedback_responses for delete to authenticated
  using ((select public.is_admin()));

-- Proteção contra envios em massa ------------------------------------------
-- Como o envio é anônimo, o limite é global: no máximo 30 avaliações por
-- minuto. O número de avaliações reais esperado fica muito abaixo disso.

create function public.feedback_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.feedback_responses
    where created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'Muitas avaliações enviadas agora. Tente novamente em alguns minutos.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke execute on function public.feedback_rate_limit() from public, anon, authenticated;

create trigger feedback_rate_limit
  before insert on public.feedback_responses
  for each row execute function public.feedback_rate_limit();
