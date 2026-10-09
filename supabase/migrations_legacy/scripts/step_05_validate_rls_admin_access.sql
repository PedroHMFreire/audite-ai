-- PASSO 2: Validacao de RLS (versao estavel para Supabase SQL Editor)
-- Esta validacao nao depende de impersonacao JWT no editor.

-- 1) Seleciona 1 admin valido e 1 usuario comum
with admin_candidate as (
  select ur.user_id
  from public.user_roles ur
  where ur.role = 'admin'
    and 'view_admin_dashboard' = any(ur.permissions)
  order by ur.created_at asc
  limit 1
),
regular_candidate as (
  select ur.user_id
  from public.user_roles ur
  where ur.user_id <> (select user_id from admin_candidate)
  order by ur.created_at asc
  limit 1
)
select
  (select user_id from admin_candidate) as admin_user_id,
  (select user_id from regular_candidate) as regular_user_id;

-- 2) Verifica logica de admin por dados de role/permissoes
with admin_candidate as (
  select ur.user_id
  from public.user_roles ur
  where ur.role = 'admin'
    and 'view_admin_dashboard' = any(ur.permissions)
  order by ur.created_at asc
  limit 1
),
regular_candidate as (
  select ur.user_id
  from public.user_roles ur
  where ur.user_id <> (select user_id from admin_candidate)
  order by ur.created_at asc
  limit 1
)
select
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select user_id from admin_candidate)
      and ur.role = 'admin'
      and 'view_admin_dashboard' = any(ur.permissions)
  ) as admin_should_be_true,
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select user_id from regular_candidate)
      and ur.role = 'admin'
      and 'view_admin_dashboard' = any(ur.permissions)
  ) as regular_should_be_false;

-- 2.1) Verifica assinatura da funcao is_admin no ambiente
select
  to_regprocedure('public.is_admin()') is not null as has_is_admin_no_args,
  to_regprocedure('public.is_admin(uuid)') is not null as has_is_admin_uuid_arg;

-- 3) Verifica existencia das policies novas
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and (
    (tablename = 'user_profiles' and policyname = 'user_profiles-admin-read')
    or
    (tablename = 'counts' and policyname = 'counts-admin-read')
  )
order by tablename, policyname;

-- 4) Verifica se RPC existe e esta SECURITY DEFINER
select
  n.nspname as schema_name,
  p.proname as function_name,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'admin_list_users_with_roles';

-- 5) Verifica grant de execucao para authenticated
select
  has_function_privilege('authenticated', 'public.admin_list_users_with_roles()', 'EXECUTE')
  as authenticated_can_execute_rpc;

-- 6) Opcional: smoke de leitura global (executado como papel atual do editor)
-- Observacao: isso NAO valida RLS de usuario final; serve so para conferir que tabelas existem.
select count(*) as total_user_profiles from public.user_profiles;
select count(*) as total_counts from public.counts;
