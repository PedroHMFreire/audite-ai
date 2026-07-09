-- ============================================================
-- Justificativa de divergências de contagem (excesso/falta)
-- Tabela independente de `results` (que é apagada/recriada em
-- reopenCount/compute_count_results) — chaveada por (count_id, codigo)
-- para sobreviver a reaberturas e recomputações.
-- ============================================================

CREATE TABLE public.divergence_justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.counts(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  motivo text NOT NULL CHECK (motivo IN (
    'falha_troca', 'erro_insercao', 'duplicada_sistema', 'codigo_errado', 'outra'
  )),
  observacao text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (count_id, codigo),
  CHECK (motivo <> 'outra' OR observacao IS NOT NULL)
);

CREATE INDEX idx_divergence_justifications_count_id ON public.divergence_justifications (count_id);

ALTER TABLE public.divergence_justifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "divergence_justifications-own" ON public.divergence_justifications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.counts c WHERE c.id = divergence_justifications.count_id AND c.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.counts c WHERE c.id = divergence_justifications.count_id AND c.user_id = (select auth.uid())));
