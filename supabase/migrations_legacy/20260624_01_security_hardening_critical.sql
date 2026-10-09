-- ============================================================
-- M1 — Segurança crítica
-- Aplicada via MCP em 2026-06-24
-- ============================================================

-- 1) Views: passar a respeitar o RLS das tabelas base (corrige vazamento cross-tenant)
ALTER VIEW public.category_stats   SET (security_invoker = true);
ALTER VIEW public.upcoming_schedule SET (security_invoker = true);

-- Remover grants excessivos nas views (anon/authenticated tinham INSERT/UPDATE/DELETE/TRUNCATE)
REVOKE ALL ON public.category_stats    FROM anon, authenticated;
REVOKE ALL ON public.upcoming_schedule FROM anon, authenticated;
GRANT SELECT ON public.category_stats    TO authenticated;
GRANT SELECT ON public.upcoming_schedule TO authenticated;

-- 2) user_roles: RLS estava ligado sem policy (leitura quebrada no app).
--    Permitir que cada usuário leia o PRÓPRIO papel.
CREATE POLICY "user_roles-own-read" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- 3) Funções SECURITY DEFINER: fixar search_path (fecha risco de hijack)
ALTER FUNCTION public.is_admin()                     SET search_path = '';
ALTER FUNCTION public.admin_list_users_with_roles()  SET search_path = '';
ALTER FUNCTION public.handle_new_user()              SET search_path = '';
ALTER FUNCTION public.handle_new_user_role()         SET search_path = '';
ALTER FUNCTION public.update_updated_at_column()     SET search_path = '';
ALTER FUNCTION public.get_next_available_date(date, integer, integer, integer[]) SET search_path = '';

-- 4) Revogar EXECUTE indevido
--    Triggers nunca devem ser chamáveis via RPC:
REVOKE EXECUTE ON FUNCTION public.handle_new_user()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role()  FROM PUBLIC, anon, authenticated;
--    RPCs administrativas: tirar do anon (mantém authenticated; proteção interna via is_admin)
REVOKE EXECUTE ON FUNCTION public.is_admin()                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users_with_roles() FROM PUBLIC, anon;
