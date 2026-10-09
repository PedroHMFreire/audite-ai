#!/usr/bin/env bash
# Ensaia a subida das migrações sobre um banco que já tem dados, como o de
# produção: recria o banco LOCAL só com o baseline, insere dados no formato
# antigo, aplica as migrações novas e confere que nada se perdeu.
# ATENÇÃO: apaga o banco local. Nunca toca em produção.
set -euo pipefail
cd "$(dirname "$0")/.."

DB=supabase_db_audite-ai
psql() { docker exec -i "$DB" psql -U postgres -v ON_ERROR_STOP=1 -qAt "$@"; }

echo "1. Banco local no estado do baseline (igual à produção de hoje)"
supabase db reset --local --version 20261008000000 >/dev/null 2>&1

echo "2. Dados no formato antigo"
psql <<'SQL'
-- Dois usuários criados pelo trigger antigo, com trial vindo dos metadados.
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES
 ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'antigo1@example.com', 'x', now(),
  '{"store_name":"Loja Antiga","owner_name":"Pedro","plan":"Profissional","trial_start":"2026-07-01T00:00:00Z","trial_end":"2026-07-08T00:00:00Z","trial_active":"true"}', now() - interval '90 days', now()),
 ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'antigo2@example.com', 'x', now(),
  '{}', now() - interval '30 days', now());

UPDATE public.user_profiles SET subscription_status = 'active' WHERE id = '11111111-1111-4111-8111-111111111111';
-- Um usuário sem perfil (caso de borda que a migração precisa cobrir).
DELETE FROM public.user_profiles WHERE id = '22222222-2222-4222-8222-222222222222';

INSERT INTO public.stores (id, user_id, name) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Matriz');
INSERT INTO public.counts (id, user_id, store_id, nome) VALUES
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Contagem antiga');  -- status padrão antigo
INSERT INTO public.counts (id, user_id, nome, status, finished_at) VALUES
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'Finalizada antiga', 'finalizada', now());
INSERT INTO public.plan_items (count_id, codigo, nome, saldo) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '1', 'Vestido', 3), ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '1', 'Vestido', 3);
INSERT INTO public.manual_entries (count_id, codigo, qty) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '1', 2);
INSERT INTO public.results (count_id, codigo, status, nome_produto, manual_qtd, saldo_qtd) VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '1', 'falta', 'Vestido', 2, 3);
INSERT INTO public.divergence_justifications (count_id, codigo, motivo) VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '1', 'codigo_errado');
INSERT INTO public.categories (id, user_id, name) VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '11111111-1111-4111-8111-111111111111', 'Vestidos');
INSERT INTO public.schedule_configs (id, user_id, name, sectors_per_week, start_date) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', 'Ciclo', 1, '2026-07-06');
INSERT INTO public.schedule_items (config_id, category_id, scheduled_date, week_number, day_of_week) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', '2026-07-06', 1, 1);
INSERT INTO storage.objects (bucket_id, name) VALUES ('contagens', 'arquivo-antigo.xlsx');
SQL

snapshot() {
  psql -c "SELECT 'counts', count(*), string_agg(nome, ',' ORDER BY nome) FROM public.counts
   UNION ALL SELECT 'plan_items', count(*), sum(saldo)::text FROM public.plan_items
   UNION ALL SELECT 'manual_entries', count(*), sum(qty)::text FROM public.manual_entries
   UNION ALL SELECT 'results', count(*), string_agg(status, ',') FROM public.results
   UNION ALL SELECT 'justifications', count(*), string_agg(motivo, ',') FROM public.divergence_justifications
   UNION ALL SELECT 'categories', count(*), string_agg(name, ',') FROM public.categories
   UNION ALL SELECT 'schedule_items', count(*), string_agg(status, ',') FROM public.schedule_items
   UNION ALL SELECT 'stores', count(*), string_agg(name, ',') FROM public.stores
   UNION ALL SELECT 'storage', count(*), string_agg(name, ',') FROM storage.objects
   UNION ALL SELECT 'users', count(*), string_agg(email, ',' ORDER BY email) FROM auth.users
   UNION ALL SELECT 'profile1', 1, concat_ws('|', store_name, owner_name, plan, subscription_status) FROM public.user_profiles WHERE id = '11111111-1111-4111-8111-111111111111'
   ORDER BY 1"
}
before=$(snapshot)

echo "3. Aplica as migrações novas"
supabase migration up --local >/dev/null 2>&1

echo "4. Confere"
after=$(snapshot)
if [ "$before" != "$after" ]; then
  echo "FALHOU: dados de cliente mudaram"; diff <(echo "$before") <(echo "$after") || true; exit 1
fi
echo "   dados de cliente idênticos antes e depois:"; echo "$after" | sed 's/^/     /'

check() { # descrição, sql que deve devolver 't'
  local got; got=$(psql -c "$2")
  if [ "$got" = "t" ]; then echo "   ok: $1"; else echo "FALHOU: $1 (obtido: $got)"; exit 1; fi
}
check "todo usuário ganhou assinatura em teste de 14 dias" \
  "SELECT count(*) = 2 AND bool_and(status = 'trialing' AND trial_ends_at BETWEEN now() + interval '13 days' AND now() + interval '15 days') FROM public.subscriptions"
check "usuário sem perfil ganhou perfil" "SELECT count(*) = 2 FROM public.user_profiles"
check "status antigo da contagem foi preservado" "SELECT status = 'EM ANDAMENTO' FROM public.counts WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'"
check "novo padrão de status" "SELECT column_default LIKE '%em_andamento%' FROM information_schema.columns WHERE table_name = 'counts' AND column_name = 'status'"
check "usuários antigos têm acesso" "SELECT bool_and(public.has_access(user_id)) FROM public.subscriptions"
check "item de cronograma antigo segue ativo" "SELECT archived_at IS NULL FROM public.schedule_items LIMIT 1"
check "policy de upload anônimo removida" "SELECT count(*) = 0 FROM pg_policies WHERE schemaname = 'storage'"
check "visitante sem permissão em tabelas" "SELECT count(*) = 0 FROM information_schema.role_table_grants WHERE grantee = 'anon' AND table_schema = 'public'"

echo "5. Limpa: recria o banco local do zero com todas as migrações"
# (os usuários de ensaio foram inseridos direto na tabela e confundem o serviço de login)
supabase db reset --local >/dev/null 2>&1

echo "Tudo certo: as migrações sobem sobre dados existentes sem perda."
