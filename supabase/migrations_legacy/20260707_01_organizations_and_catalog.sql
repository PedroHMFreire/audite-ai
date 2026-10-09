-- ============================================================
-- M7 — Organizações, membros, convites e catálogo de produtos
-- ============================================================

-- 1. Organizações
CREATE TABLE public.organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- 2. Membros (um usuário pertence a no máximo uma organização)
CREATE TABLE public.organization_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  display_name text,
  joined_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id)
);

-- 3. Convites — link compartilhável, expira em 7 dias
CREATE TABLE public.organization_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by  uuid NOT NULL REFERENCES auth.users(id),
  token       uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  note        text,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id),
  expires_at  timestamptz DEFAULT (now() + interval '7 days') NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- 4. Catálogo mestre de produtos
CREATE TABLE public.product_catalog (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  codigo     text NOT NULL,
  nome       text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (org_id, codigo)
);

CREATE INDEX idx_product_catalog_org_codigo
  ON public.product_catalog (org_id, codigo text_pattern_ops);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.organizations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_catalog         ENABLE ROW LEVEL SECURITY;

-- Funções auxiliares (SECURITY INVOKER — respeitam RLS do chamador)
CREATE OR REPLACE FUNCTION public.my_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.organization_members
  WHERE user_id = auth.uid() AND role = 'admin'
); $$;

-- organizations: cada membro lê apenas a sua
CREATE POLICY "read own org" ON public.organizations
  FOR SELECT USING (id = public.my_org_id());

-- organization_members: membro lê todos os membros da sua org
CREATE POLICY "read own org members" ON public.organization_members
  FOR SELECT USING (org_id = public.my_org_id());

-- organization_invitations: admin gerencia; qualquer autenticado pode ler (para aceitar via token)
CREATE POLICY "admin manages invitations" ON public.organization_invitations
  FOR ALL
  USING  (public.is_org_admin() AND org_id = public.my_org_id())
  WITH CHECK (public.is_org_admin() AND org_id = public.my_org_id());

CREATE POLICY "authenticated reads invitation" ON public.organization_invitations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- product_catalog: membro lê; admin escreve
CREATE POLICY "member reads catalog" ON public.product_catalog
  FOR SELECT USING (org_id = public.my_org_id());

CREATE POLICY "admin writes catalog" ON public.product_catalog
  FOR ALL
  USING  (org_id = public.my_org_id() AND public.is_org_admin())
  WITH CHECK (org_id = public.my_org_id() AND public.is_org_admin());

-- ============================================================
-- RPCs (SECURITY DEFINER onde há operações cross-user)
-- ============================================================

-- Criar organização e tornar criador admin numa única transação
CREATE OR REPLACE FUNCTION public.create_organization(p_name text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_org_id     uuid;
  v_disp_name  text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Você já pertence a uma organização';
  END IF;

  SELECT owner_name INTO v_disp_name FROM public.user_profiles WHERE id = auth.uid();

  INSERT INTO public.organizations (name, created_by)
  VALUES (trim(p_name), auth.uid())
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role, display_name)
  VALUES (v_org_id, auth.uid(), 'admin', COALESCE(v_disp_name, 'Admin'));

  RETURN v_org_id;
END;
$$;

-- Aceitar convite e entrar na organização
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_org_id    uuid;
  v_inv_id    uuid;
  v_disp_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT id, org_id INTO v_inv_id, v_org_id
  FROM public.organization_invitations
  WHERE token = p_token AND accepted_at IS NULL AND expires_at > now();

  IF v_inv_id IS NULL THEN RAISE EXCEPTION 'Convite inválido ou expirado'; END IF;

  IF EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Você já pertence a uma organização';
  END IF;

  SELECT owner_name INTO v_disp_name FROM public.user_profiles WHERE id = auth.uid();

  INSERT INTO public.organization_members (org_id, user_id, role, display_name)
  VALUES (v_org_id, auth.uid(), 'member', COALESCE(v_disp_name, 'Membro'));

  UPDATE public.organization_invitations
  SET accepted_at = now(), accepted_by = auth.uid()
  WHERE id = v_inv_id;

  RETURN v_org_id;
END;
$$;

-- Upsert em lote do catálogo (apenas admin)
CREATE OR REPLACE FUNCTION public.bulk_upsert_catalog(p_items jsonb)
RETURNS int
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
  v_count  int;
BEGIN
  SELECT org_id INTO v_org_id FROM public.organization_members WHERE user_id = auth.uid();
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Você não pertence a nenhuma organização'; END IF;
  IF NOT public.is_org_admin() THEN RAISE EXCEPTION 'Apenas administradores podem atualizar o catálogo'; END IF;

  INSERT INTO public.product_catalog (org_id, codigo, nome, updated_at)
  SELECT v_org_id,
         trim(item->>'codigo'),
         COALESCE(NULLIF(trim(item->>'nome'), ''), ''),
         now()
  FROM jsonb_array_elements(p_items) item
  WHERE trim(item->>'codigo') <> ''
  ON CONFLICT (org_id, codigo)
  DO UPDATE SET nome = EXCLUDED.nome, updated_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Permissões
REVOKE EXECUTE ON FUNCTION public.create_organization(text)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(uuid)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bulk_upsert_catalog(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_org_id()                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin()             FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_organization(text)  TO authenticated;
GRANT  EXECUTE ON FUNCTION public.accept_invitation(uuid)    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.bulk_upsert_catalog(jsonb) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.my_org_id()                TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_org_admin()             TO authenticated;
