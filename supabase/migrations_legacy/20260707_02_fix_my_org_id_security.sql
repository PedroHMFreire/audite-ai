-- Fix: my_org_id() com SECURITY INVOKER causava recursão RLS infinita.
-- A policy em organization_members chama my_org_id(), que por sua vez
-- consulta organization_members, disparando a policy novamente.
-- Solução: SECURITY DEFINER para que a função leia a tabela sem aplicar RLS.

CREATE OR REPLACE FUNCTION public.my_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1; $$;

-- Permissões (mantém igual ao anterior)
REVOKE EXECUTE ON FUNCTION public.my_org_id() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.my_org_id() TO authenticated;
