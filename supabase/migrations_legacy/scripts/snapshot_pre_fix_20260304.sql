-- Snapshot de dados para auditoria antes da aplicação das correções 1-4
-- Versão resiliente: não falha se alguma tabela ainda não existir.
-- Execute no SQL Editor do Supabase e exporte os resultados.

-- 0) Inventário de tabelas esperadas
select
  t.table_name,
  (to_regclass('public.' || t.table_name) is not null) as exists_in_db
from (
  values
    ('manual_entries'),
    ('user_profiles'),
    ('counts'),
    ('conversion_events'),
    ('conversion_metrics_cache'),
    ('user_roles')
) as t(table_name)
order by t.table_name;

-- 1) Metadados de colunas (não falha se tabela não existir)
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('manual_entries', 'user_profiles', 'conversion_events', 'conversion_metrics_cache')
order by table_name, ordinal_position;

-- 2) Snapshot dinâmico em JSON (somente para tabelas existentes)
drop table if exists tmp_snapshot_results;
create temporary table tmp_snapshot_results (
  section text not null,
  payload jsonb not null
);

do $$
declare
  v_count bigint;
begin
  if to_regclass('public.manual_entries') is not null then
    execute 'select count(*) from public.manual_entries' into v_count;
    insert into tmp_snapshot_results(section, payload)
    values ('manual_entries_total', jsonb_build_object('total', v_count));
  else
    insert into tmp_snapshot_results(section, payload)
    values ('manual_entries_total', jsonb_build_object('warning', 'table public.manual_entries não existe'));
  end if;

  if to_regclass('public.user_profiles') is not null then
    execute $sql$
      insert into tmp_snapshot_results(section, payload)
      select
        'user_profiles_plan_status',
        jsonb_build_object(
          'plan', coalesce(plan, 'null'),
          'subscription_status', coalesce(subscription_status, 'null'),
          'total', count(*)
        )
      from public.user_profiles
      group by plan, subscription_status
      order by count(*) desc
    $sql$;
  else
    insert into tmp_snapshot_results(section, payload)
    values ('user_profiles_plan_status', jsonb_build_object('warning', 'table public.user_profiles não existe'));
  end if;

  if to_regclass('public.conversion_events') is not null then
    execute $sql$
      insert into tmp_snapshot_results(section, payload)
      select
        'conversion_events_by_type',
        jsonb_build_object('event_type', event_type, 'total', count(*))
      from public.conversion_events
      group by event_type
      order by count(*) desc
    $sql$;
  else
    insert into tmp_snapshot_results(section, payload)
    values ('conversion_events_by_type', jsonb_build_object('warning', 'table public.conversion_events não existe'));
  end if;

  if to_regclass('public.conversion_metrics_cache') is not null then
    execute $sql$
      insert into tmp_snapshot_results(section, payload)
      select
        'conversion_metrics_cache_latest',
        to_jsonb(c)
      from (
        select *
        from public.conversion_metrics_cache
        order by calculated_at desc
        limit 30
      ) c
    $sql$;
  else
    insert into tmp_snapshot_results(section, payload)
    values ('conversion_metrics_cache_latest', jsonb_build_object('warning', 'table public.conversion_metrics_cache não existe'));
  end if;
end $$;

select section, payload
from tmp_snapshot_results
order by section;
