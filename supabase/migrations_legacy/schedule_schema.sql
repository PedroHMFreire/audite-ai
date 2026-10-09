-- =============================================
-- AUDITE.AI - Sistema de Cronograma de Contagens
-- Script SQL para Supabase
-- =============================================

-- 1. TABELA: categories (Categorias/Setores da loja)
-- =============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  priority integer DEFAULT 1 CHECK (priority >= 1 AND priority <= 5), -- 1=baixa, 5=alta
  color text DEFAULT '#6B7280', -- Hex color para UI
  is_active boolean DEFAULT true,
  last_counted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. TABELA: schedule_configs (Configuração de cronograma)
-- =============================================
CREATE TABLE IF NOT EXISTS public.schedule_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  sectors_per_week integer NOT NULL CHECK (sectors_per_week >= 1 AND sectors_per_week <= 10),
  start_date date NOT NULL,
  end_date date,
  total_weeks integer DEFAULT 4 CHECK (total_weeks >= 1 AND total_weeks <= 52),
  work_days integer[] DEFAULT '{1,2,3,4,5}', -- 1=seg, 2=ter, ..., 7=dom
  is_active boolean DEFAULT true,
  generated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. TABELA: schedule_items (Cronograma gerado)
-- =============================================
CREATE TABLE IF NOT EXISTS public.schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.schedule_configs(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  week_number integer NOT NULL CHECK (week_number >= 1),
  day_of_week integer NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'rescheduled')),
  count_id uuid REFERENCES public.counts(id) ON DELETE SET NULL, -- Link para contagem realizada
  notes text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. TABELA: schedule_history (Histórico de reagendamentos)
-- =============================================
CREATE TABLE IF NOT EXISTS public.schedule_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_item_id uuid NOT NULL REFERENCES public.schedule_items(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'rescheduled', 'completed', 'skipped')),
  old_date date,
  new_date date,
  reason text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_priority ON public.categories(user_id, priority DESC);

-- Schedule Configs
CREATE INDEX IF NOT EXISTS idx_schedule_configs_user_id ON public.schedule_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_configs_active ON public.schedule_configs(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_schedule_configs_dates ON public.schedule_configs(start_date, end_date);

-- Schedule Items
CREATE INDEX IF NOT EXISTS idx_schedule_items_config ON public.schedule_items(config_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_category ON public.schedule_items(category_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_date ON public.schedule_items(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_schedule_items_week ON public.schedule_items(config_id, week_number);
CREATE INDEX IF NOT EXISTS idx_schedule_items_status ON public.schedule_items(status);
CREATE INDEX IF NOT EXISTS idx_schedule_items_pending ON public.schedule_items(scheduled_date) WHERE status = 'pending';

-- Schedule History
CREATE INDEX IF NOT EXISTS idx_schedule_history_item ON public.schedule_history(schedule_item_id);
CREATE INDEX IF NOT EXISTS idx_schedule_history_user ON public.schedule_history(user_id);

-- =============================================
-- TRIGGERS PARA AUTO-UPDATE
-- =============================================

-- Function para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_configs_updated_at BEFORE UPDATE ON public.schedule_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_items_updated_at BEFORE UPDATE ON public.schedule_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS UTILITÁRIAS
-- =============================================

-- Function para calcular próxima data disponível
CREATE OR REPLACE FUNCTION get_next_available_date(
  p_start_date date,
  p_week_offset integer,
  p_day_of_week integer,
  p_work_days integer[]
)
RETURNS date AS $$
DECLARE
  base_date date;
  target_date date;
BEGIN
  -- Calcula data base da semana
  base_date := p_start_date + (p_week_offset * interval '7 days');
  
  -- Ajusta para segunda-feira da semana
  base_date := base_date - (extract(dow from base_date) - 1) * interval '1 day';
  
  -- Calcula data alvo
  target_date := base_date + (p_day_of_week - 1) * interval '1 day';
  
  -- Verifica se é dia útil permitido
  IF p_day_of_week = ANY(p_work_days) THEN
    RETURN target_date;
  ELSE
    -- Se não é dia útil, retorna NULL
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS - CATEGORIES
-- =============================================

CREATE POLICY "categories_own_data" ON public.categories
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS RLS - SCHEDULE_CONFIGS
-- =============================================

CREATE POLICY "schedule_configs_own_data" ON public.schedule_configs
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS RLS - SCHEDULE_ITEMS
-- =============================================

CREATE POLICY "schedule_items_own_data" ON public.schedule_items
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.schedule_configs sc 
      WHERE sc.id = config_id AND sc.user_id = auth.uid()
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schedule_configs sc 
      WHERE sc.id = config_id AND sc.user_id = auth.uid()
    )
  );

-- =============================================
-- POLÍTICAS RLS - SCHEDULE_HISTORY
-- =============================================

CREATE POLICY "schedule_history_own_data" ON public.schedule_history
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- VIEWS ÚTEIS
-- =============================================

-- View: Próximas contagens (hoje e próximos 7 dias)
CREATE OR REPLACE VIEW upcoming_schedule AS
SELECT 
  si.id,
  si.scheduled_date,
  si.status,
  si.week_number,
  si.day_of_week,
  c.name as category_name,
  c.color as category_color,
  c.priority,
  sc.name as config_name,
  sc.user_id,
  CASE 
    WHEN si.scheduled_date = CURRENT_DATE THEN 'today'
    WHEN si.scheduled_date < CURRENT_DATE THEN 'overdue'
    WHEN si.scheduled_date <= CURRENT_DATE + interval '7 days' THEN 'upcoming'
    ELSE 'future'
  END as urgency
FROM public.schedule_items si
JOIN public.categories c ON c.id = si.category_id
JOIN public.schedule_configs sc ON sc.id = si.config_id
WHERE 
  si.status = 'pending' 
  AND sc.is_active = true
  AND si.scheduled_date <= CURRENT_DATE + interval '7 days'
ORDER BY si.scheduled_date ASC, c.priority DESC;

-- View: Estatísticas por categoria
CREATE OR REPLACE VIEW category_stats AS
SELECT 
  c.id,
  c.name,
  c.priority,
  c.last_counted_at,
  COUNT(si.id) as total_scheduled,
  COUNT(CASE WHEN si.status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN si.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN si.status = 'skipped' THEN 1 END) as skipped_count,
  sc.user_id
FROM public.categories c
LEFT JOIN public.schedule_items si ON si.category_id = c.id
LEFT JOIN public.schedule_configs sc ON sc.id = si.config_id AND sc.is_active = true
WHERE c.is_active = true
GROUP BY c.id, c.name, c.priority, c.last_counted_at, sc.user_id;

-- =============================================
-- DADOS DE EXEMPLO (OPCIONAL)
-- =============================================

-- Exemplo de categorias para teste
/*
INSERT INTO public.categories (user_id, name, description, priority, color) VALUES
(auth.uid(), 'Roupas Masculinas', 'Setor de vestuário masculino', 4, '#3B82F6'),
(auth.uid(), 'Roupas Femininas', 'Setor de vestuário feminino', 5, '#EC4899'),
(auth.uid(), 'Calçados', 'Todos os tipos de calçados', 3, '#8B5CF6'),
(auth.uid(), 'Acessórios', 'Bolsas, cintos, bijuterias', 2, '#10B981'),
(auth.uid(), 'Roupas Infantis', 'Vestuário infantil', 3, '#F59E0B'),
(auth.uid(), 'Lingerie', 'Roupas íntimas', 2, '#EF4444'),
(auth.uid(), 'Esportivos', 'Roupas e acessórios esportivos', 3, '#06B6D4');
*/

-- =============================================
-- COMENTÁRIOS FINAIS
-- =============================================

-- Este script cria uma estrutura completa para:
-- 1. Gerenciar categorias/setores da loja
-- 2. Configurar cronogramas de contagem cíclica
-- 3. Gerar automaticamente schedule de contagens
-- 4. Acompanhar histórico e estatísticas
-- 5. Manter segurança com RLS por usuário

-- Para usar: Execute este script no SQL Editor do Supabase
-- Todas as tabelas e políticas serão criadas automaticamente