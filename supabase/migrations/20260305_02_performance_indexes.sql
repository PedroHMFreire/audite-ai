-- =====================================================
-- Passo 5: Índices compostos para performance
-- Criados em 2026-03-05
-- =====================================================

-- ===== ÍNDICES PARA COUNTS (busca com user_id) =====
-- Otimiza: getCounts() e RecentCounts()
CREATE INDEX IF NOT EXISTS idx_counts_user_created 
  ON public.counts(user_id, created_at DESC);

-- ===== ÍNDICES PARA CATEGORIES =====
-- Otimiza: getCategories() com filtro is_active
CREATE INDEX IF NOT EXISTS idx_categories_user_active 
  ON public.categories(user_id, is_active, priority DESC) 
  WHERE is_active = true;

-- ===== ÍNDICES PARA SCHEDULE_CONFIGS =====
-- Otimiza: getScheduleConfigs() e getActiveScheduleConfig()
CREATE INDEX IF NOT EXISTS idx_schedule_configs_user_active 
  ON public.schedule_configs(user_id, is_active) 
  WHERE is_active = true;

-- ===== ÍNDICES PARA SCHEDULE_ITEMS =====
-- Otimiza: getScheduleItemsWithDetails() com joins
CREATE INDEX IF NOT EXISTS idx_schedule_items_config_archived 
  ON public.schedule_items(config_id, archived_at) 
  WHERE archived_at IS NULL;

-- Otimiza: queries por categoria e data
CREATE INDEX IF NOT EXISTS idx_schedule_items_category_date 
  ON public.schedule_items(category_id, scheduled_date) 
  WHERE archived_at IS NULL;

-- ===== ÍNDICES PARA PLAN_ITEMS E MANUAL_ENTRIES =====
-- Otimiza: queries que agregam por count_id
CREATE INDEX IF NOT EXISTS idx_plan_items_count_codigo 
  ON public.plan_items(count_id, codigo);

CREATE INDEX IF NOT EXISTS idx_manual_entries_count_created 
  ON public.manual_entries(count_id, created_at DESC);

-- ===== ÍNDICES PARA RESULTS =====
-- Otimiza: getResultsByCount() com filtro status
CREATE INDEX IF NOT EXISTS idx_results_count_status 
  ON public.results(count_id, status);

-- ===== DOCUMENT: Índices criados e seu propósito
-- Para debug/teste, execute: EXPLAIN ANALYZE ...

/*
Resumo dos Índices Criados:

1. idx_counts_user_created
   - Tabela: counts
   - Colunas: user_id, created_at DESC
   - Uso: RecentCounts() listing, getCounts()
   - Benefício: Evita full table scan para "últimos counts"

2. idx_categories_user_active
   - Tabela: categories
   - Colunas: user_id, is_active, priority DESC
   - Onde: is_active = true (partial index)
   - Uso: getCategories(), listagens de categorias ativas
   - Benefício: Apenas categorias ativas ocupam espaço; ordenação por priority

3. idx_schedule_configs_user_active
   - Tabela: schedule_configs
   - Colunas: user_id, is_active
   - Onde: is_active = true (partial index)
   - Uso: getScheduleConfigs(), getActiveScheduleConfig()
   - Benefício: Evita varredura de configs inativos

4. idx_schedule_items_config_archived
   - Tabela: schedule_items
   - Colunas: config_id, archived_at
   - Onde: archived_at IS NULL (partial index)
   - Uso: getScheduleItems(), getScheduleItemsWithDetails()
   - Benefício: Filtra automaticamente itens não arquivados

5. idx_schedule_items_category_date
   - Tabela: schedule_items
   - Colunas: category_id, scheduled_date
   - Onde: archived_at IS NULL (partial index)
   - Uso: Queries por categoria em intervalo de datas
   - Benefício: Suporta range queries eficientes

6. idx_plan_items_count_codigo
   - Tabela: plan_items
   - Colunas: count_id, codigo
   - Uso: Busca de producto específico em count
   - Benefício: Otimiza verificação de duplicatas

7. idx_manual_entries_count_created
   - Tabela: manual_entries
   - Colunas: count_id, created_at DESC
   - Uso: Listagens de entradas manuais por count
   - Benefício: Ordem cronológica sem sort em memória

8. idx_results_count_status
   - Tabela: results
   - Colunas: count_id, status
   - Uso: Análise de resultado com filtro por status
   - Benefício: Otimiza filtros 'regular', 'excesso', 'falta'
*/
