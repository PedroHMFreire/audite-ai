-- Security hardening for admin features
-- 1) remove frontend need for auth.admin API by exposing a guarded RPC
-- 2) allow admin-only reads needed by admin dashboard

-- Admin-only read policy for user profiles
DROP POLICY IF EXISTS "user_profiles-admin-read" ON public.user_profiles;
CREATE POLICY "user_profiles-admin-read" ON public.user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND 'view_admin_dashboard' = ANY(ur.permissions)
    )
  );

-- Admin-only read policy for counts
DROP POLICY IF EXISTS "counts-admin-read" ON public.counts;
CREATE POLICY "counts-admin-read" ON public.counts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND 'view_admin_dashboard' = ANY(ur.permissions)
    )
  );

-- Guarded RPC for admin user listing
CREATE OR REPLACE FUNCTION public.admin_list_users_with_roles()
RETURNS TABLE (
  user_id uuid,
  email text,
  role text,
  permissions text[],
  created_at timestamp with time zone
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar usuarios';
  END IF;

  RETURN QUERY
  SELECT
    au.id AS user_id,
    au.email,
    COALESCE(ur.role, 'user') AS role,
    COALESCE(ur.permissions, '{}'::text[]) AS permissions,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_list_users_with_roles() TO authenticated;
