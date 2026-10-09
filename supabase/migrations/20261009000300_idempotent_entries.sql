-- Leituras da contagem à prova de reenvio.
--
-- O app guarda as leituras feitas sem internet e reenvia quando a conexão
-- volta. Se a resposta do servidor se perdia no caminho, a mesma leitura era
-- enviada de novo e somada duas vezes. Agora cada leitura tem um identificador
-- gerado no aparelho; o servidor registra os já recebidos e ignora repetições.
--
-- A função antiga (3 argumentos) é mantida para quem ainda estiver com uma
-- versão do app em cache.

CREATE TABLE public.manual_entry_receipts (
  count_id   uuid NOT NULL REFERENCES public.counts(id) ON DELETE CASCADE,
  entry_id   text NOT NULL CHECK (char_length(entry_id) BETWEEN 8 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (count_id, entry_id)
);

-- Só a função abaixo grava aqui; o cliente não lê nem escreve direto.
ALTER TABLE public.manual_entry_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.manual_entry_receipts FROM anon, authenticated;
GRANT ALL ON public.manual_entry_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.add_manual_entry(
  p_count_id uuid,
  p_codigo   text,
  p_qty      integer,
  p_entry_id text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_status text;
  v_codigo text := btrim(p_codigo);
BEGIN
  SELECT c.status INTO v_status
  FROM public.counts c
  WHERE c.id = p_count_id AND c.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'contagem_nao_encontrada' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_access() THEN
    RAISE EXCEPTION 'assinatura_inativa' USING ERRCODE = '42501';
  END IF;
  IF v_status IN ('finalizada', 'arquivada') THEN
    RAISE EXCEPTION 'contagem_fechada' USING ERRCODE = '42501';
  END IF;
  IF v_codigo = '' OR char_length(v_codigo) > 60 THEN
    RAISE EXCEPTION 'codigo_invalido' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.manual_entry_receipts (count_id, entry_id)
  VALUES (p_count_id, p_entry_id)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RETURN false;  -- leitura já recebida: não soma de novo
  END IF;

  INSERT INTO public.manual_entries (count_id, codigo, qty)
  VALUES (p_count_id, v_codigo, LEAST(999999, GREATEST(1, COALESCE(p_qty, 1))))
  ON CONFLICT (count_id, codigo)
  DO UPDATE SET qty = LEAST(999999, public.manual_entries.qty + GREATEST(1, COALESCE(p_qty, 1)));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.add_manual_entry(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_manual_entry(uuid, text, integer, text) TO authenticated, service_role;
