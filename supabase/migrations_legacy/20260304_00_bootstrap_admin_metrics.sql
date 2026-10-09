-- Bootstrap mínimo para ambientes onde as tabelas/funções de métricas ainda não existem.
-- Execute antes do fix da função de métricas.

create extension if not exists pgcrypto;

-- Roles de usuário (base para is_admin)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  role text not null default 'user' check (role in ('admin', 'moderator', 'user')),
  permissions text[] not null default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role);

alter table public.user_roles enable row level security;

drop policy if exists "user_roles_admin_only" on public.user_roles;
create policy "user_roles_admin_only" on public.user_roles
  for all using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
        and 'view_admin_dashboard' = any(ur.permissions)
    )
  );

-- Eventos de conversão
create table if not exists public.conversion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null,
  event_data jsonb default '{}',
  session_id text,
  page_url text,
  user_agent text,
  timestamp timestamp with time zone default now()
);

create index if not exists idx_conversion_events_user on public.conversion_events(user_id);
create index if not exists idx_conversion_events_type on public.conversion_events(event_type);
create index if not exists idx_conversion_events_timestamp on public.conversion_events(timestamp desc);

alter table public.conversion_events enable row level security;

drop policy if exists "conversion_events_own" on public.conversion_events;
create policy "conversion_events_own" on public.conversion_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cache de métricas administrativas
create table if not exists public.conversion_metrics_cache (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  total_users integer not null default 0,
  total_trials integer not null default 0,
  total_conversions integer not null default 0,
  conversion_rate numeric(5,2) not null default 0,
  revenue numeric(12,2) not null default 0,
  churn_rate numeric(5,2) not null default 0,
  average_time_to_convert numeric(8,2) not null default 0,
  calculated_at timestamp with time zone default now(),
  unique(period_start, period_end)
);

create index if not exists idx_conversion_metrics_period on public.conversion_metrics_cache(period_start, period_end);

alter table public.conversion_metrics_cache enable row level security;

drop policy if exists "conversion_metrics_admin_only" on public.conversion_metrics_cache;
create policy "conversion_metrics_admin_only" on public.conversion_metrics_cache
  for all using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
        and 'view_admin_dashboard' = any(ur.permissions)
    )
  );

-- Tabela de auditoria admin (usada por log_admin_action)
create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb default '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_admin_sessions_user_id on public.admin_sessions(user_id);
create index if not exists idx_admin_sessions_created_at on public.admin_sessions(created_at desc);

alter table public.admin_sessions enable row level security;

drop policy if exists "admin_sessions_admin_only" on public.admin_sessions;
create policy "admin_sessions_admin_only" on public.admin_sessions
  for all using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
        and 'view_admin_dashboard' = any(ur.permissions)
    )
  );

-- Funções utilitárias de admin
create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean as $$
begin
  return exists (
    select 1
    from public.user_roles ur
    where ur.user_id = $1
      and ur.role = 'admin'
      and 'view_admin_dashboard' = any(ur.permissions)
  );
end;
$$ language plpgsql security definer;

create or replace function public.log_admin_action(
  action_type text,
  target_user_id uuid default null,
  details jsonb default '{}'
) returns void as $$
begin
  insert into public.admin_sessions (
    user_id,
    action,
    target_user_id,
    details,
    ip_address,
    user_agent
  ) values (
    auth.uid(),
    action_type,
    target_user_id,
    details,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
end;
$$ language plpgsql security definer;
