-- ============================================================
-- M6 — RPCs de contagem (executam no banco, sem limite de 1000 linhas)
-- Aplicada via MCP em 2026-06-24
-- ============================================================

-- 1) Upsert incremental de entrada manual (atômico, soma qty por código)
CREATE OR REPLACE FUNCTION public.add_manual_entry(
  p_count_id uuid, p_codigo text, p_qty int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.manual_entries (count_id, codigo, qty)
  VALUES (p_count_id, p_codigo, GREATEST(1, COALESCE(p_qty, 1)))
  ON CONFLICT (count_id, codigo)
  DO UPDATE SET qty = public.manual_entries.qty + GREATEST(1, COALESCE(p_qty, 1));
END;
$$;

-- 2) Cruzamento completo: plano x entradas -> results (atômico, sem truncamento)
CREATE OR REPLACE FUNCTION public.compute_count_results(p_count_id uuid)
RETURNS TABLE(regular int, falta int, excesso int, total int)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Posse validada pelo RLS (INVOKER): se não for dono, nada é afetado.
  IF NOT EXISTS (
    SELECT 1 FROM public.counts c
    WHERE c.id = p_count_id AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão para finalizar esta contagem';
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

-- Permissões: só usuários autenticados
REVOKE EXECUTE ON FUNCTION public.add_manual_entry(uuid, text, int)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_count_results(uuid)         FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.add_manual_entry(uuid, text, int)   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.compute_count_results(uuid)         TO authenticated;
