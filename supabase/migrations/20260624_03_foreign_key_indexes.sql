-- ============================================================
-- M3 — Índices de cobertura para foreign keys
-- Aplicada via MCP em 2026-06-24
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_admin_sessions_target_user_id ON public.admin_sessions (target_user_id);
CREATE INDEX IF NOT EXISTS idx_count_files_count_id          ON public.count_files (count_id);
CREATE INDEX IF NOT EXISTS idx_counts_store_id               ON public.counts (store_id);
CREATE INDEX IF NOT EXISTS idx_reports_count_id              ON public.reports (count_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_count_id       ON public.schedule_items (count_id);
