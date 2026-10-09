-- ============================================================
-- M2 — Otimização de performance do RLS
--   * auth.uid() -> (select auth.uid())  (evita reavaliação por linha)
--   * role {public} -> {authenticated}
--   * consolida policies permissivas duplicadas (counts, user_profiles)
-- Aplicada via MCP em 2026-06-24
-- ============================================================

-- ---- Tabelas "own" simples ----
DROP POLICY "categories_own_data" ON public.categories;
CREATE POLICY "categories-own" ON public.categories FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "schedule_configs_own_data" ON public.schedule_configs;
CREATE POLICY "schedule_configs-own" ON public.schedule_configs FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "schedule_history_own_data" ON public.schedule_history;
CREATE POLICY "schedule_history-own" ON public.schedule_history FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "stores-own" ON public.stores;
CREATE POLICY "stores-own" ON public.stores FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- ---- Tabelas filhas (EXISTS via counts) ----
DROP POLICY "count_files-own" ON public.count_files;
CREATE POLICY "count_files-own" ON public.count_files FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counts c WHERE c.id = count_files.count_id AND c.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.counts c WHERE c.id = count_files.count_id AND c.user_id = (select auth.uid())));

DROP POLICY "manual_entries-own" ON public.manual_entries;
CREATE POLICY "manual_entries-own" ON public.manual_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counts c WHERE c.id = manual_entries.count_id AND c.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.counts c WHERE c.id = manual_entries.count_id AND c.user_id = (select auth.uid())));

DROP POLICY "plan_items-own" ON public.plan_items;
CREATE POLICY "plan_items-own" ON public.plan_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counts c WHERE c.id = plan_items.count_id AND c.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.counts c WHERE c.id = plan_items.count_id AND c.user_id = (select auth.uid())));

DROP POLICY "reports-own" ON public.reports;
CREATE POLICY "reports-own" ON public.reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counts c WHERE c.id = reports.count_id AND c.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.counts c WHERE c.id = reports.count_id AND c.user_id = (select auth.uid())));

DROP POLICY "results-own" ON public.results;
CREATE POLICY "results-own" ON public.results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counts c WHERE c.id = results.count_id AND c.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.counts c WHERE c.id = results.count_id AND c.user_id = (select auth.uid())));

-- ---- schedule_items (EXISTS via schedule_configs) ----
DROP POLICY "schedule_items_own_data" ON public.schedule_items;
CREATE POLICY "schedule_items-own" ON public.schedule_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.schedule_configs sc WHERE sc.id = schedule_items.config_id AND sc.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.schedule_configs sc WHERE sc.id = schedule_items.config_id AND sc.user_id = (select auth.uid())));

-- ---- counts: consolidar (own + admin-read) eliminando policies SELECT duplicadas ----
DROP POLICY "counts-own" ON public.counts;
DROP POLICY "counts-admin-read" ON public.counts;
CREATE POLICY "counts-insert" ON public.counts FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "counts-update" ON public.counts FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "counts-delete" ON public.counts FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "counts-select" ON public.counts FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = (select auth.uid())
                 AND ur.role = 'admin'
                 AND 'view_admin_dashboard' = ANY (ur.permissions))
  );

-- ---- user_profiles: consolidar (own + admin-read) ----
DROP POLICY "user_profiles-own" ON public.user_profiles;
DROP POLICY "user_profiles-admin-read" ON public.user_profiles;
CREATE POLICY "user_profiles-insert" ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "user_profiles-update" ON public.user_profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "user_profiles-delete" ON public.user_profiles FOR DELETE TO authenticated
  USING ((select auth.uid()) = id);
CREATE POLICY "user_profiles-select" ON public.user_profiles FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = id
    OR EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = (select auth.uid())
                 AND ur.role = 'admin'
                 AND 'view_admin_dashboard' = ANY (ur.permissions))
  );
