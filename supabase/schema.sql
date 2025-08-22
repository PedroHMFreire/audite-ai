-- Habilite a extensão UUID se necessário:
-- create extension if not exists "uuid-ossp";

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
alter table public.counts enable row level security;
alter table public.count_files enable row level security;
alter table public.plan_items enable row level security;
alter table public.manual_entries enable row level security;
alter table public.results enable row level security;
alter table public.reports enable row level security;

-- Policies: cada usuário enxerga apenas seus dados
create policy if not exists "stores-own" on public.stores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "counts-own" on public.counts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "count_files-own" on public.count_files
  for all using (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()));

create policy if not exists "plan_items-own" on public.plan_items
  for all using (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()));

create policy if not exists "manual_entries-own" on public.manual_entries
  for all using (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()));

create policy if not exists "results-own" on public.results
  for all using (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()));

create policy if not exists "reports-own" on public.reports
  for all using (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.counts c where c.id = count_id and c.user_id = auth.uid()));
