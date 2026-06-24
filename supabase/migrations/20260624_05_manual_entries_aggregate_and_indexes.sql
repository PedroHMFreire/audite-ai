-- ============================================================
-- M5 — Modelo agregado de manual_entries + índices de cruzamento
-- Aplicada via MCP em 2026-06-24
-- ============================================================

-- 1) Consolidar linhas redundantes: somar qty por (count_id, codigo),
--    mantendo a linha mais antiga como "keeper".
WITH keeper AS (
  SELECT DISTINCT ON (count_id, codigo) id
  FROM public.manual_entries
  ORDER BY count_id, codigo, created_at ASC
),
sums AS (
  SELECT count_id, codigo, SUM(qty)::int AS total
  FROM public.manual_entries
  GROUP BY count_id, codigo
)
UPDATE public.manual_entries m
SET qty = s.total
FROM keeper k
JOIN public.manual_entries km ON km.id = k.id
JOIN sums s ON s.count_id = km.count_id AND s.codigo = km.codigo
WHERE m.id = k.id;

-- Remover as linhas duplicadas (não-keepers)
DELETE FROM public.manual_entries m
WHERE m.id NOT IN (
  SELECT DISTINCT ON (count_id, codigo) id
  FROM public.manual_entries
  ORDER BY count_id, codigo, created_at ASC
);

-- 2) Garantir unicidade por (count_id, codigo) — habilita upsert incremental
ALTER TABLE public.manual_entries
  ADD CONSTRAINT manual_entries_count_codigo_uniq UNIQUE (count_id, codigo);

-- 3) Índice de cobertura para o cruzamento por código no plano
CREATE INDEX IF NOT EXISTS idx_plan_items_count_codigo
  ON public.plan_items (count_id, codigo);
