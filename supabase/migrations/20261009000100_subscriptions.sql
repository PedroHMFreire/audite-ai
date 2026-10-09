-- Assinatura e período de teste controlados pelo servidor.
-- Estrutura pronta para o Stripe: o webhook grava nesta tabela com service_role.

CREATE TABLE public.subscriptions (
  user_id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- trialing/active/past_due/canceled/unpaid/incomplete/incomplete_expired/paused
  -- seguem os status do Stripe; "comp" é acesso liberado manualmente (cortesia).
  status                 text NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing','active','past_due','canceled','unpaid',
                      'incomplete','incomplete_expired','paused','comp')),
  trial_ends_at          timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  stripe_customer_id     text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id        text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- O cliente só lê a própria assinatura. Nenhuma escrita pelo navegador.
REVOKE ALL ON public.subscriptions FROM anon, authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

CREATE POLICY "subscriptions-select-own" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

-- Eventos do Stripe já processados (idempotência do webhook). Só service_role.
CREATE TABLE public.stripe_events (
  id          text PRIMARY KEY,
  type        text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_events FROM anon, authenticated;
GRANT ALL ON public.stripe_events TO service_role;

-- Usuários existentes: recebem um período de teste novo de 14 dias a partir
-- desta migração, para não perderem acesso aos dados que já criaram.
INSERT INTO public.subscriptions (user_id, status, trial_ends_at)
SELECT u.id, 'trialing', now() + interval '14 days'
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- Regra única de acesso.
CREATE OR REPLACE FUNCTION public.has_access(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = p_user_id AND r.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = p_user_id
        AND CASE s.status
              WHEN 'active'   THEN true
              WHEN 'past_due' THEN true  -- o Stripe ainda está tentando cobrar
              WHEN 'trialing' THEN COALESCE(s.trial_ends_at, s.current_period_end) > now()
              WHEN 'canceled' THEN s.current_period_end > now()
              WHEN 'comp'     THEN s.current_period_end IS NULL OR s.current_period_end > now()
              ELSE false
            END
    );
$$;

REVOKE ALL ON FUNCTION public.has_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_access(uuid) TO authenticated, service_role;

-- Resumo da assinatura para o app (uma chamada só).
CREATE OR REPLACE FUNCTION public.my_access()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT jsonb_build_object(
    'has_access',           public.has_access(auth.uid()),
    'is_admin',             public.is_admin(),
    'status',               s.status,
    'trial_ends_at',        s.trial_ends_at,
    'current_period_end',   s.current_period_end,
    'cancel_at_period_end', COALESCE(s.cancel_at_period_end, false),
    'has_stripe_customer',  s.stripe_customer_id IS NOT NULL
  )
  FROM (SELECT auth.uid() AS uid) me
  LEFT JOIN public.subscriptions s ON s.user_id = me.uid;
$$;

REVOKE ALL ON FUNCTION public.my_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_access() TO authenticated, service_role;

-- Cadastro: o trial era definido pelo navegador (datas vinham nos metadados
-- do signup). Agora o servidor define: 7 dias a partir da criação da conta.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, store_name, owner_name, phone, segment)
  VALUES (
    new.id,
    left(new.raw_user_meta_data->>'store_name', 120),
    left(new.raw_user_meta_data->>'owner_name', 120),
    left(new.raw_user_meta_data->>'phone', 30),
    left(new.raw_user_meta_data->>'segment', 40)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, status, trial_ends_at)
  VALUES (new.id, 'trialing', now() + interval '7 days')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Sem acesso (trial vencido ou assinatura inativa) o usuário continua lendo
-- e exportando o que já tem, mas não cria nem altera contagens.

DROP POLICY "counts-insert" ON public.counts;
CREATE POLICY "counts-insert" ON public.counts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.has_access()));

DROP POLICY "manual_entries-own" ON public.manual_entries;
CREATE POLICY "manual_entries-select" ON public.manual_entries
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counts c
                 WHERE c.id = manual_entries.count_id AND c.user_id = (SELECT auth.uid())));
CREATE POLICY "manual_entries-delete" ON public.manual_entries
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counts c
                 WHERE c.id = manual_entries.count_id AND c.user_id = (SELECT auth.uid())));
CREATE POLICY "manual_entries-insert" ON public.manual_entries
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_access())
              AND EXISTS (SELECT 1 FROM public.counts c
                          WHERE c.id = manual_entries.count_id AND c.user_id = (SELECT auth.uid())));
CREATE POLICY "manual_entries-update" ON public.manual_entries
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counts c
                 WHERE c.id = manual_entries.count_id AND c.user_id = (SELECT auth.uid())))
  WITH CHECK ((SELECT public.has_access())
              AND EXISTS (SELECT 1 FROM public.counts c
                          WHERE c.id = manual_entries.count_id AND c.user_id = (SELECT auth.uid())));

DROP POLICY "plan_items-own" ON public.plan_items;
CREATE POLICY "plan_items-select" ON public.plan_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counts c
                 WHERE c.id = plan_items.count_id AND c.user_id = (SELECT auth.uid())));
CREATE POLICY "plan_items-delete" ON public.plan_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counts c
                 WHERE c.id = plan_items.count_id AND c.user_id = (SELECT auth.uid())));
CREATE POLICY "plan_items-insert" ON public.plan_items
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_access())
              AND EXISTS (SELECT 1 FROM public.counts c
                          WHERE c.id = plan_items.count_id AND c.user_id = (SELECT auth.uid())));
CREATE POLICY "plan_items-update" ON public.plan_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counts c
                 WHERE c.id = plan_items.count_id AND c.user_id = (SELECT auth.uid())))
  WITH CHECK ((SELECT public.has_access())
              AND EXISTS (SELECT 1 FROM public.counts c
                          WHERE c.id = plan_items.count_id AND c.user_id = (SELECT auth.uid())));

-- Liberação manual de acesso pelo administrador (cortesia ou venda fora do Stripe).
CREATE OR REPLACE FUNCTION public.admin_grant_access(p_user_id uuid, p_days integer DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF p_days IS NOT NULL AND (p_days < 1 OR p_days > 3650) THEN
    RAISE EXCEPTION 'Quantidade de dias inválida';
  END IF;

  INSERT INTO public.subscriptions (user_id, status, current_period_end)
  VALUES (p_user_id, 'comp',
          CASE WHEN p_days IS NULL THEN NULL ELSE now() + make_interval(days => p_days) END)
  ON CONFLICT (user_id) DO UPDATE
    SET status = 'comp',
        current_period_end = EXCLUDED.current_period_end;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_access(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_access(uuid, integer) TO authenticated, service_role;

-- Lista de clientes para o painel administrativo.
CREATE OR REPLACE FUNCTION public.admin_list_customers()
RETURNS TABLE (
  user_id uuid, email text, store_name text, owner_name text,
  created_at timestamptz, last_sign_in_at timestamptz,
  status text, trial_ends_at timestamptz, current_period_end timestamptz,
  has_access boolean, counts_total bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text, p.store_name, p.owner_name,
         u.created_at, u.last_sign_in_at,
         s.status, s.trial_ends_at, s.current_period_end,
         public.has_access(u.id),
         (SELECT count(*) FROM public.counts c WHERE c.user_id = u.id)
  FROM auth.users u
  LEFT JOIN public.user_profiles p ON p.id = u.id
  LEFT JOIN public.subscriptions s ON s.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_customers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_customers() TO authenticated, service_role;

-- Finalizar contagem também exige acesso ativo.
CREATE OR REPLACE FUNCTION public.compute_count_results(p_count_id uuid)
RETURNS TABLE (regular integer, falta integer, excesso integer, total integer)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.counts c
    WHERE c.id = p_count_id AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão para finalizar esta contagem';
  END IF;

  IF NOT public.has_access() THEN
    RAISE EXCEPTION 'assinatura_inativa';
  END IF;

  DELETE FROM public.results WHERE count_id = p_count_id;

  WITH plan AS (
    SELECT codigo, max(nome) AS nome, sum(saldo)::int AS saldo
    FROM public.plan_items WHERE count_id = p_count_id GROUP BY codigo
  ),
  man AS (
    SELECT codigo, sum(qty)::int AS qty
    FROM public.manual_entries WHERE count_id = p_count_id GROUP BY codigo
  ),
  joined AS (
    SELECT
      COALESCE(p.codigo, m.codigo) AS codigo,
      COALESCE(p.nome, '')         AS nome,
      COALESCE(p.saldo, 0)         AS saldo,
      COALESCE(m.qty, 0)           AS qty
    FROM plan p FULL OUTER JOIN man m ON m.codigo = p.codigo
  )
  INSERT INTO public.results (count_id, codigo, status, nome_produto, manual_qtd, saldo_qtd)
  SELECT
    p_count_id, codigo,
    CASE WHEN saldo = qty THEN 'regular'
         WHEN saldo > qty THEN 'falta'
         ELSE 'excesso' END,
    nome, qty, saldo
  FROM joined;

  UPDATE public.counts
  SET status = 'finalizada', finished_at = now()
  WHERE id = p_count_id;

  RETURN QUERY
    SELECT
      count(*) FILTER (WHERE r.status='regular')::int,
      count(*) FILTER (WHERE r.status='falta')::int,
      count(*) FILTER (WHERE r.status='excesso')::int,
      count(*)::int
    FROM public.results r WHERE r.count_id = p_count_id;
END;
$$;

-- Exclusão de conta pelo próprio usuário (LGPD). Apaga todos os dados dele.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = v_uid
      AND s.stripe_subscription_id IS NOT NULL
      AND s.status IN ('active','past_due','trialing')
      AND NOT s.cancel_at_period_end
  ) THEN
    RAISE EXCEPTION 'assinatura_ativa';
  END IF;

  DELETE FROM public.schedule_history WHERE user_id = v_uid;
  DELETE FROM public.schedule_configs WHERE user_id = v_uid;  -- itens em cascata
  DELETE FROM public.categories       WHERE user_id = v_uid;
  DELETE FROM public.counts           WHERE user_id = v_uid;  -- itens, resultados e justificativas em cascata
  DELETE FROM public.stores           WHERE user_id = v_uid;

  UPDATE public.organization_invitations SET accepted_by = NULL WHERE accepted_by = v_uid;
  DELETE FROM public.organization_invitations WHERE invited_by = v_uid;
  UPDATE public.divergence_justifications SET created_by = NULL WHERE created_by = v_uid;

  DELETE FROM auth.users WHERE id = v_uid;  -- perfil, papel, assinatura e organização em cascata
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
