-- Habilite a extensão UUID se necessário:
-- create extension if not exists "uuid-ossp";

-- Tabela de perfis de usuário com informações de teste e planos
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  store_name text,
  owner_name text,
  phone text,
  segment text,
  plan text,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  trial_active boolean default false,
  subscription_status text default 'trial',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.counts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  store_id uuid references public.stores(id) on delete set null,
  nome text not null,
  status text,
  created_at timestamp with time zone default now()
);

create table if not exists public.count_files (
  id uuid primary key default gen_random_uuid(),
  count_id uuid references public.counts(id) on delete cascade,
  storage_path text,
  original_name text,
  parsed_at timestamp with time zone
);

create table if not exists public.plan_items (
  id uuid primary key default gen_random_uuid(),
  count_id uuid references public.counts(id) on delete cascade,
  codigo text not null,
  nome text,
  saldo integer not null default 0
);

create table if not exists public.manual_entries (
  id uuid primary key default gen_random_uuid(),
  count_id uuid references public.counts(id) on delete cascade,
  codigo text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  count_id uuid references public.counts(id) on delete cascade,
  codigo text not null,
  status text not null check (status in ('regular','excesso','falta')),
  manual_qtd integer not null default 0,
  saldo_qtd integer not null default 0,
  nome_produto text
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  count_id uuid references public.counts(id) on delete cascade,
  pdf_storage_path text,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_counts_user on public.counts(user_id);
create index if not exists idx_counts_created on public.counts(created_at desc);
create index if not exists idx_plan_items_count on public.plan_items(count_id);
create index if not exists idx_manual_entries_count on public.manual_entries(count_id);
create index if not exists idx_results_count on public.results(count_id);

-- RLS
alter table public.stores enable row level security;
alter table public.user_profiles enable row level security;
alter table public.counts enable row level security;
alter table public.count_files enable row level security;
alter table public.plan_items enable row level security;
alter table public.manual_entries enable row level security;
alter table public.results enable row level security;
alter table public.reports enable row level security;

-- Policies: cada usuário enxerga apenas seus dados
-- Primeiro remove as policies se existirem, depois cria novas
drop policy if exists "user_profiles-own" on public.user_profiles;
create policy "user_profiles-own" on public.user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "stores-own" on public.stores;
create policy "stores-own" on public.stores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "counts-own" on public.counts;
create policy "counts-own" on public.counts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "count_files-own" on public.count_files;
create policy "count_files-own" on public.count_files
  for all using (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()));

drop policy if exists "plan_items-own" on public.plan_items;
create policy "plan_items-own" on public.plan_items
  for all using (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()));

drop policy if exists "manual_entries-own" on public.manual_entries;
create policy "manual_entries-own" on public.manual_entries
  for all using (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()));

drop policy if exists "results-own" on public.results;
create policy "results-own" on public.results
  for all using (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()));

drop policy if exists "reports-own" on public.reports;
create policy "reports-own" on public.reports
  for all using (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()));

-- Função para criar perfil automaticamente quando usuário se registra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (
    id,
    store_name,
    owner_name,
    phone,
    segment,
    plan,
    trial_start,
    trial_end,
    trial_active,
    subscription_status
  )
  values (
    new.id,
    new.raw_user_meta_data->>'store_name',
    new.raw_user_meta_data->>'owner_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'segment',
    new.raw_user_meta_data->>'plan',
    (new.raw_user_meta_data->>'trial_start')::timestamp with time zone,
    (new.raw_user_meta_data->>'trial_end')::timestamp with time zone,
    coalesce((new.raw_user_meta_data->>'trial_active')::boolean, true),
    coalesce(new.raw_user_meta_data->>'subscription_status', 'trial')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para criar perfil automaticamente
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===== TABELAS DE SEGURANÇA E AUDITORIA =====

-- Tabela para logs de segurança
create table if not exists public.security_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default now()
);

-- Tabela para tentativas de login
create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  success boolean not null,
  ip_address text,
  user_agent text,
  error_message text,
  created_at timestamp with time zone default now()
);

-- Tabela para sessões ativas (opcional para tracking)
create table if not exists public.active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_token text unique not null,
  ip_address text,
  user_agent text,
  last_activity timestamp with time zone default now(),
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Índices para performance de segurança
create index if not exists idx_security_logs_user on public.security_logs(user_id);
create index if not exists idx_security_logs_created on public.security_logs(created_at desc);
create index if not exists idx_login_attempts_email on public.login_attempts(email);
create index if not exists idx_login_attempts_created on public.login_attempts(created_at desc);
create index if not exists idx_active_sessions_user on public.active_sessions(user_id);
create index if not exists idx_active_sessions_expires on public.active_sessions(expires_at);

-- RLS para tabelas de segurança
alter table public.security_logs enable row level security;
alter table public.login_attempts enable row level security;
alter table public.active_sessions enable row level security;

-- Políticas de segurança (admins podem ver tudo, usuários só seus dados)
drop policy if exists "security_logs_own" on public.security_logs;
create policy "security_logs_own" on public.security_logs
  for select using (auth.uid() = user_id);

drop policy if exists "login_attempts_own" on public.login_attempts;
create policy "login_attempts_own" on public.login_attempts
  for select using (auth.uid()::text = email); -- Comparação por email

drop policy if exists "active_sessions_own" on public.active_sessions;
create policy "active_sessions_own" on public.active_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Função para limpar sessões expiradas
create or replace function public.cleanup_expired_sessions()
returns void as $$
begin
  delete from public.active_sessions 
  where expires_at < now();
end;
$$ language plpgsql security definer;

-- Função para logging de segurança
create or replace function public.log_security_event(
  p_event_type text,
  p_event_details jsonb default '{}',
  p_ip_address text default null,
  p_user_agent text default null
)
returns uuid as $$
declare
  log_id uuid;
begin
  insert into public.security_logs (
    user_id,
    event_type,
    event_details,
    ip_address,
    user_agent
  )
  values (
    auth.uid(),
    p_event_type,
    p_event_details,
    p_ip_address,
    p_user_agent
  )
  returning id into log_id;
  
  return log_id;
end;
$$ language plpgsql security definer;

-- ===== TABELAS PARA MELHORIAS COMERCIAIS =====

-- Tabela para eventos de conversão (Analytics)
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

-- Tabela para tickets de suporte
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  subject text not null,
  description text not null,
  category text not null check (category in ('bug', 'feature', 'billing', 'general')),
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tabela para respostas de suporte
create table if not exists public.support_responses (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.support_tickets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  admin_id uuid references auth.users(id) on delete set null,
  message text not null,
  is_internal boolean default false,
  created_at timestamp with time zone default now()
);

-- Tabela para base de conhecimento
create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null,
  tags text[] default '{}',
  views integer default 0,
  helpful_count integer default 0,
  is_published boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tabela para progresso de onboarding
create table if not exists public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  step_id text not null,
  completed_at timestamp with time zone,
  skipped_at timestamp with time zone,
  data jsonb default '{}'
);

-- Índices para performance
create index if not exists idx_conversion_events_user on public.conversion_events(user_id);
create index if not exists idx_conversion_events_type on public.conversion_events(event_type);
create index if not exists idx_conversion_events_timestamp on public.conversion_events(timestamp desc);
create index if not exists idx_support_tickets_user on public.support_tickets(user_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_responses_ticket on public.support_responses(ticket_id);
create index if not exists idx_knowledge_base_category on public.knowledge_base(category);
create index if not exists idx_onboarding_progress_user on public.onboarding_progress(user_id);

-- RLS para novas tabelas
alter table public.conversion_events enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_responses enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.onboarding_progress enable row level security;

-- Políticas para conversion_events
drop policy if exists "conversion_events_own" on public.conversion_events;
create policy "conversion_events_own" on public.conversion_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Políticas para support_tickets
drop policy if exists "support_tickets_own" on public.support_tickets;
create policy "support_tickets_own" on public.support_tickets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Políticas para support_responses
drop policy if exists "support_responses_view" on public.support_responses;
create policy "support_responses_view" on public.support_responses
  for select using (
    exists (
      select 1 from public.support_tickets st 
      where st.id = ticket_id and st.user_id = auth.uid()
    )
  );

drop policy if exists "support_responses_insert" on public.support_responses;
create policy "support_responses_insert" on public.support_responses
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.support_tickets st 
      where st.id = ticket_id and st.user_id = auth.uid()
    )
  );

-- Políticas para knowledge_base (leitura pública)
drop policy if exists "knowledge_base_read" on public.knowledge_base;
create policy "knowledge_base_read" on public.knowledge_base
  for select using (is_published = true);

-- Políticas para onboarding_progress
drop policy if exists "onboarding_progress_own" on public.onboarding_progress;
create policy "onboarding_progress_own" on public.onboarding_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Função para atualizar timestamp de support_tickets
create or replace function public.update_support_ticket_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger para atualizar timestamp automaticamente
create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute procedure public.update_support_ticket_timestamp();

-- ========================================
-- TABELAS DE PERMISSÕES E ROLES
-- ========================================

-- Tabela de roles de usuários (admin, moderator, user)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  role text not null default 'user' check (role in ('admin', 'moderator', 'user')),
  permissions text[] not null default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tabela de sessões administrativas para auditoria
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

-- Tabela agregada de métricas de conversão (cache para performance)
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

-- Indexes para performance
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role);
create index if not exists idx_admin_sessions_user_id on public.admin_sessions(user_id);
create index if not exists idx_admin_sessions_created_at on public.admin_sessions(created_at desc);
create index if not exists idx_conversion_metrics_period on public.conversion_metrics_cache(period_start, period_end);

-- RLS para tabelas de permissões
alter table public.user_roles enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.conversion_metrics_cache enable row level security;

-- Políticas para user_roles (apenas admins podem ver/editar)
drop policy if exists "user_roles_admin_only" on public.user_roles;
create policy "user_roles_admin_only" on public.user_roles
  for all using (
    exists (
      select 1 from public.user_roles ur 
      where ur.user_id = auth.uid() 
      and ur.role = 'admin' 
      and 'view_admin_dashboard' = any(ur.permissions)
    )
  );

-- Políticas para admin_sessions (apenas admins podem ver)
drop policy if exists "admin_sessions_admin_only" on public.admin_sessions;
create policy "admin_sessions_admin_only" on public.admin_sessions
  for all using (
    exists (
      select 1 from public.user_roles ur 
      where ur.user_id = auth.uid() 
      and ur.role = 'admin'
      and 'view_admin_dashboard' = any(ur.permissions)
    )
  );

-- Políticas para conversion_metrics_cache (apenas admins podem ver)
drop policy if exists "conversion_metrics_admin_only" on public.conversion_metrics_cache;
create policy "conversion_metrics_admin_only" on public.conversion_metrics_cache
  for all using (
    exists (
      select 1 from public.user_roles ur 
      where ur.user_id = auth.uid() 
      and ur.role = 'admin'
      and 'view_admin_dashboard' = any(ur.permissions)
    )
  );

-- Função para criar role padrão para novos usuários
create or replace function public.handle_new_user_role()
returns trigger as $$
begin
  -- Insere role padrão 'user' para novos usuários
  insert into public.user_roles (user_id, role, permissions)
  values (new.id, 'user', '{}');
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para criar role automaticamente
drop trigger if exists on_auth_user_created_role on auth.users;
create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute procedure public.handle_new_user_role();

-- Função para log de ações administrativas
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

-- Função para verificar se usuário é admin
create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean as $$
begin
  return exists (
    select 1 from public.user_roles ur
    where ur.user_id = $1
    and ur.role = 'admin'
    and 'view_admin_dashboard' = any(ur.permissions)
  );
end;
$$ language plpgsql security definer;

-- Função para atualizar cache de métricas
create or replace function public.update_conversion_metrics_cache(
  start_date date,
  end_date date
) returns void as $$
declare
  metrics_data record;
begin
  -- Só admins podem executar
  if not public.is_admin() then
    raise exception 'Acesso negado: apenas administradores podem atualizar métricas';
  end if;

  -- Calcula métricas do período
  with trials as (
    select user_id, timestamp::date as date
    from public.conversion_events
    where event_type = 'trial_signup_complete'
    and timestamp::date between start_date and end_date
  ),
  conversions as (
    select user_id, timestamp::date as date
    from public.conversion_events
    where event_type = 'subscription_active'
    and timestamp::date between start_date and end_date
  ),
  churns as (
    select user_id, timestamp::date as date
    from public.conversion_events
    where event_type = 'churn'
    and timestamp::date between start_date and end_date
  )
  select 
    (select count(distinct user_id) from auth.users where created_at::date between start_date and end_date) as total_users,
    (select count(*) from trials) as total_trials,
    (select count(*) from conversions) as total_conversions,
    case when (select count(*) from trials) > 0 
         then ((select count(*) from conversions)::numeric / (select count(*) from trials)::numeric) * 100 
         else 0 end as conversion_rate,
    (select count(*) from conversions) * 97 as revenue, -- R$ 97 por conversão
    case when (select count(*) from conversions) > 0 
         then ((select count(*) from churns)::numeric / (select count(*) from conversions)::numeric) * 100 
         else 0 end as churn_rate,
    14.5 as average_time_to_convert -- Média estimada em dias
  into metrics_data;

  -- Insere ou atualiza cache
  insert into public.conversion_metrics_cache (
    period_start,
    period_end,
    total_users,
    total_trials,
    total_conversions,
    conversion_rate,
    revenue,
    churn_rate,
    average_time_to_convert
  ) values (
    start_date,
    end_date,
    metrics_data.total_users,
    metrics_data.total_trials,
    metrics_data.total_conversions,
    metrics_data.conversion_rate,
    metrics_data.revenue,
    metrics_data.churn_rate,
    metrics_data.average_time_to_convert
  )
  on conflict (period_start, period_end) do update set
    total_users = excluded.total_users,
    total_trials = excluded.total_trials,
    total_conversions = excluded.total_conversions,
    conversion_rate = excluded.conversion_rate,
    revenue = excluded.revenue,
    churn_rate = excluded.churn_rate,
    average_time_to_convert = excluded.average_time_to_convert,
    calculated_at = now();

  -- Log da ação
  perform public.log_admin_action(
    'update_conversion_metrics',
    null,
    jsonb_build_object('period_start', start_date, 'period_end', end_date)
  );
end;
$$ language plpgsql security definer;
