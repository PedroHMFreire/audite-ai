-- Cronograma: o app arquiva itens ao regenerar ou excluir um cronograma
-- (status 'archived' + archived_at), mas essa estrutura nunca chegou ao banco
-- de produção, então gerar ou listar o cronograma falhava.
-- Só acrescenta coluna e amplia a restrição; nenhum dado existente muda.

ALTER TABLE public.schedule_items
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.schedule_items
  DROP CONSTRAINT IF EXISTS schedule_items_status_check;

ALTER TABLE public.schedule_items
  ADD CONSTRAINT schedule_items_status_check
  CHECK (status = ANY (ARRAY['pending', 'completed', 'skipped', 'rescheduled', 'archived']));

CREATE INDEX IF NOT EXISTS idx_schedule_items_active
  ON public.schedule_items (config_id, scheduled_date)
  WHERE archived_at IS NULL;

-- Estatísticas por categoria não contam itens arquivados.
CREATE OR REPLACE VIEW public.category_stats WITH (security_invoker = 'true') AS
SELECT c.id,
       c.name,
       c.priority,
       c.last_counted_at,
       count(si.id) AS total_scheduled,
       count(CASE WHEN si.status = 'completed' THEN 1 END) AS completed_count,
       count(CASE WHEN si.status = 'pending' THEN 1 END) AS pending_count,
       count(CASE WHEN si.status = 'skipped' THEN 1 END) AS skipped_count,
       sc.user_id
FROM public.categories c
LEFT JOIN public.schedule_items si ON si.category_id = c.id AND si.archived_at IS NULL
LEFT JOIN public.schedule_configs sc ON sc.id = si.config_id AND sc.is_active = true
WHERE c.is_active = true
GROUP BY c.id, c.name, c.priority, c.last_counted_at, sc.user_id;

REVOKE ALL ON public.category_stats FROM anon, authenticated;
GRANT SELECT ON public.category_stats TO authenticated;
