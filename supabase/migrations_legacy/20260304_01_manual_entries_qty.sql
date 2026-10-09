-- Fix #2: alinhar schema com backend adicionando qty em manual_entries
alter table if exists public.manual_entries
add column if not exists qty integer not null default 1;

-- Normalização defensiva para ambientes legados
update public.manual_entries
set qty = 1
where qty is null or qty < 1;
