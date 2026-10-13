-- Cronograma por equipe: vendedores, responsáveis por categoria e por contagem,
-- e roteiro cíclico (semanal, quinzenal ou mensal) com orientações.
-- Só cria tabelas e acrescenta colunas; nenhum dado existente muda.

-- 1. Vendedores da loja. São um cadastro do dono da conta, sem login próprio.
CREATE TABLE IF NOT EXISTS public.sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  phone text CHECK (phone IS NULL OR length(phone) <= 30),
  -- Vendedor removido fica inativo: o histórico das contagens dele continua legível.
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sellers_user ON public.sellers (user_id);

CREATE OR REPLACE TRIGGER update_sellers_updated_at
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Responsáveis padrão de cada categoria. Sem nenhum = toda a equipe.
CREATE TABLE IF NOT EXISTS public.category_sellers (
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_category_sellers_seller ON public.category_sellers (seller_id);

-- 3. Responsáveis de cada contagem programada. Sem nenhum = toda a equipe.
--    É copiado da categoria ao gerar o roteiro e pode ser ajustado item a item.
CREATE TABLE IF NOT EXISTS public.schedule_item_sellers (
  schedule_item_id uuid NOT NULL REFERENCES public.schedule_items(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  PRIMARY KEY (schedule_item_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_item_sellers_seller ON public.schedule_item_sellers (seller_id);

-- 4. Roteiro cíclico. Cronogramas antigos ficam com frequency nula e continuam
--    sendo regenerados pela regra antiga (categorias por semana).
ALTER TABLE public.schedule_configs
  ADD COLUMN IF NOT EXISTS frequency text,
  ADD COLUMN IF NOT EXISTS cycles integer,
  ADD COLUMN IF NOT EXISTS instructions text;

ALTER TABLE public.schedule_configs
  DROP CONSTRAINT IF EXISTS schedule_configs_frequency_check;
ALTER TABLE public.schedule_configs
  ADD CONSTRAINT schedule_configs_frequency_check
  CHECK (frequency IS NULL OR frequency = ANY (ARRAY['weekly', 'biweekly', 'monthly']));

ALTER TABLE public.schedule_configs
  DROP CONSTRAINT IF EXISTS schedule_configs_cycles_check;
ALTER TABLE public.schedule_configs
  ADD CONSTRAINT schedule_configs_cycles_check
  CHECK (cycles IS NULL OR cycles BETWEEN 1 AND 52);

ALTER TABLE public.schedule_configs
  DROP CONSTRAINT IF EXISTS schedule_configs_instructions_check;
ALTER TABLE public.schedule_configs
  ADD CONSTRAINT schedule_configs_instructions_check
  CHECK (instructions IS NULL OR length(instructions) <= 2000);

-- 5. Acesso: cada conta só enxerga e altera a própria equipe.
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_item_sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sellers-own" ON public.sellers;
CREATE POLICY "sellers-own" ON public.sellers TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- O vínculo exige que as duas pontas sejam da mesma conta.
DROP POLICY IF EXISTS "category_sellers-own" ON public.category_sellers;
CREATE POLICY "category_sellers-own" ON public.category_sellers TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_id AND c.user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_id AND c.user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "schedule_item_sellers-own" ON public.schedule_item_sellers;
CREATE POLICY "schedule_item_sellers-own" ON public.schedule_item_sellers TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.schedule_items si
      JOIN public.schedule_configs sc ON sc.id = si.config_id
      WHERE si.id = schedule_item_id AND sc.user_id = (SELECT auth.uid())
    )
    AND EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schedule_items si
      JOIN public.schedule_configs sc ON sc.id = si.config_id
      WHERE si.id = schedule_item_id AND sc.user_id = (SELECT auth.uid())
    )
    AND EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.user_id = (SELECT auth.uid()))
  );

REVOKE ALL ON public.sellers, public.category_sellers, public.schedule_item_sellers FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers, public.category_sellers, public.schedule_item_sellers TO authenticated;
GRANT ALL ON public.sellers, public.category_sellers, public.schedule_item_sellers TO service_role;
