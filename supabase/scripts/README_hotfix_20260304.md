# Hotfix Backend 2026-03-04 (Itens 1, 2, 3 e 4)

Execute os arquivos abaixo no **SQL Editor do Supabase**, exatamente nesta ordem.

## Passo 1 - Snapshot pré-correção

Arquivo:
- `supabase/scripts/snapshot_pre_fix_20260304.sql`

Objetivo:
- mapear quais tabelas já existem;
- registrar baseline de dados antes das correções.

## Passo 2 - Corrigir `manual_entries.qty`

Arquivo:
- `supabase/migrations/20260304_01_manual_entries_qty.sql`

Objetivo:
- alinhar schema com backend;
- garantir `qty` válido nos dados existentes.

## Passo 3 - Bootstrap de métricas/admin (caso faltante)

Arquivo:
- `supabase/migrations/20260304_00_bootstrap_admin_metrics.sql`

Objetivo:
- criar estruturas ausentes para admin e métricas:
  - `user_roles`
  - `conversion_events`
  - `conversion_metrics_cache`
  - `admin_sessions`
  - funções `is_admin` e `log_admin_action`

## Passo 4 - Corrigir função de atualização de métricas

Arquivo:
- `supabase/migrations/20260304_02_fix_conversion_metrics.sql`

Objetivo:
- corrigir uso de `auth.users.id` na função;
- atualizar cache com `ON CONFLICT` válido.

## Passo 5 - Validar aplicação do hotfix

Arquivo:
- `supabase/scripts/step_04_validate_hotfix_20260304.sql`

Objetivo:
- confirmar tabelas/funções;
- confirmar coluna `qty`;
- validar dados mínimos para dashboard.
