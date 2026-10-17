-- Analytica: datas por linha, métricas disponíveis por arquivo e TikTok Ads.
--
-- O que muda:
-- - datasets: aceita o formato 'tiktok' e guarda quais métricas opcionais
--   (conversões, receita) existiam no arquivo. Métrica ausente não é zero:
--   o app deixa de exibi-la.
-- - campaigns: cada linha pode guardar o período a que se refere
--   (report_date e report_end_date), para o filtro de período.
-- - save_dataset_v2: salva o arquivo com as datas e as métricas disponíveis,
--   numa única transação e com as mesmas regras de RLS.
--
-- Impacto: só adiciona colunas (opcionais), uma função e amplia a lista de
-- formatos aceitos. Nenhum dado é alterado ou apagado. Arquivos salvos antes
-- ficam com as colunas novas vazias e continuam abrindo normalmente (são
-- tratados como "todas as métricas disponíveis" e "sem datas").
-- A função antiga save_dataset é mantida, para que uma versão do site ainda
-- aberta no navegador continue salvando durante a atualização.

-- Conjuntos de dados ----------------------------------------------------------

alter table public.datasets
  drop constraint datasets_source_format_check;

alter table public.datasets
  add constraint datasets_source_format_check
  check (source_format in ('analytica', 'meta', 'google', 'tiktok', 'generic', 'sample'));

alter table public.datasets
  add column available_fields text[]
  check (
    available_fields is null
    or available_fields <@ array['conversions', 'revenue']::text[]
  );

comment on column public.datasets.available_fields is
  'Métricas opcionais presentes no arquivo. Nulo = arquivo salvo antes desta coluna (todas).';

-- Campanhas -------------------------------------------------------------------

alter table public.campaigns
  add column report_date date,
  add column report_end_date date;

alter table public.campaigns
  add constraint campaigns_report_period_check
  check (
    report_end_date is null
    or (report_date is not null and report_end_date >= report_date)
  );

comment on column public.campaigns.report_date is
  'Data (ou início do período) da linha no relatório. Nulo quando o arquivo não tem datas.';

create index campaigns_dataset_date_idx
  on public.campaigns (dataset_id, report_date);

-- Salvar um arquivo com datas e métricas disponíveis --------------------------

create function public.save_dataset_v2(
  p_name text,
  p_source_format text,
  p_campaigns jsonb,
  p_available_fields text[]
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

  -- Relatórios por dia têm mais linhas: o limite é maior que o da versão 1.
  if jsonb_array_length(p_campaigns) > 20000 then
    raise exception 'Limite de 20000 linhas por arquivo.' using errcode = '22023';
  end if;

  insert into public.datasets (user_id, name, source_format, available_fields)
  values (v_user_id, p_name, p_source_format, p_available_fields)
  returning id into v_dataset_id;

  insert into public.campaigns (
    dataset_id, user_id, name, platform,
    investment, impressions, clicks, conversions, revenue,
    report_date, report_end_date
  )
  select
    v_dataset_id, v_user_id, c.name, c.platform,
    c.investment, c.impressions, c.clicks, c.conversions, c.revenue,
    c.report_date, c.report_end_date
  from jsonb_to_recordset(p_campaigns) as c (
    name text,
    platform text,
    investment numeric,
    impressions numeric,
    clicks numeric,
    conversions numeric,
    revenue numeric,
    report_date date,
    report_end_date date
  );

  return v_dataset_id;
end;
$$;

revoke execute on function public.save_dataset_v2 (text, text, jsonb, text[])
  from public, anon;

grant execute on function public.save_dataset_v2 (text, text, jsonb, text[])
  to authenticated;
