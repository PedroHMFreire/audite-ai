-- Validação pós-hotfix (itens 1-4)

-- 1) Estado de tabelas críticas
select
  t.table_name,
  (to_regclass('public.' || t.table_name) is not null) as exists_in_db
from (
  values
    ('manual_entries'),
    ('user_roles'),
    ('conversion_events'),
    ('conversion_metrics_cache'),
    ('admin_sessions')
) as t(table_name)
order by t.table_name;

-- 2) Coluna qty em manual_entries
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'manual_entries'
  and column_name = 'qty';

select
  count(*) as total_rows,
  count(*) filter (where qty is null) as qty_null,
  count(*) filter (where qty < 1) as qty_invalid
from public.manual_entries;

-- 3) Funções disponíveis
select
  proname as function_name
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('is_admin', 'log_admin_action', 'update_conversion_metrics_cache')
order by proname;

-- 4) Distribuição atual de planos/status (apoio para validar dashboard)
select
  plan,
  subscription_status,
  count(*) as total
from public.user_profiles
group by plan, subscription_status
order by total desc;
