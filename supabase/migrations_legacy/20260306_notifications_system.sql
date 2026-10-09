-- =============================================
-- AUDITE.AI - Sistema de Notificações de Auditorias
-- Migration: 20260306_notifications_system.sql
-- =============================================

-- 1. TABELA: notifications_preferences
-- Preferências de notificação do usuário
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Canais habilitados
  in_app_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT false,
  
  -- Timing (dias/horas antes da auditoria)
  notify_7_days_before boolean DEFAULT true,
  notify_1_day_before boolean DEFAULT true,
  notify_1_hour_before boolean DEFAULT true,
  notify_at_time boolean DEFAULT true,
  
  -- Horário preferido para notificações
  preferred_notification_time time DEFAULT '09:00:00',
  timezone text DEFAULT 'America/Sao_Paulo',
  
  -- Silent hours (não notificar entre X e Y)
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time,
  quiet_hours_end time,
  
  -- Flag para aceitar notificações
  notifications_enabled boolean DEFAULT true,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. TABELA: notifications_log
-- Log de todas as notificações enviadas
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_item_id uuid NOT NULL REFERENCES public.schedule_items(id) ON DELETE CASCADE,
  
  notification_type text NOT NULL CHECK (notification_type IN ('7_days', '1_day', '1_hour', 'now')),
  channel text NOT NULL CHECK (channel IN ('in_app', 'push', 'email')),
  
  message text NOT NULL,
  title text,
  
  sent_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone,
  clicked_at timestamp with time zone,
  
  status text DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message text,
  metadata jsonb,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_notifications_preferences_user_id 
  ON public.notifications_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_log_user_id 
  ON public.notifications_log(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_log_schedule_item_id 
  ON public.notifications_log(schedule_item_id);

CREATE INDEX IF NOT EXISTS idx_notifications_log_sent_at 
  ON public.notifications_log(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_log_status 
  ON public.notifications_log(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notifications_log_unread 
  ON public.notifications_log(user_id, read_at) WHERE read_at IS NULL;

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_notifications_preferences_updated_at 
  BEFORE UPDATE ON public.notifications_preferences
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_log_updated_at 
  BEFORE UPDATE ON public.notifications_log
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.notifications_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- Política para preferences: usuario só vê suas próprias
CREATE POLICY "Users can view own notifications preferences"
  ON public.notifications_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications preferences"
  ON public.notifications_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications preferences"
  ON public.notifications_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política para log: usuário só vê seus próprios logs
CREATE POLICY "Users can view own notifications log"
  ON public.notifications_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications log"
  ON public.notifications_log
  FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS UTILITÁRIAS
-- =============================================

-- Function para obter preferências do usuário (com defaults)
CREATE OR REPLACE FUNCTION get_or_create_notification_preferences(p_user_id uuid)
RETURNS public.notifications_preferences AS $$
DECLARE
  v_preferences public.notifications_preferences;
BEGIN
  SELECT * INTO v_preferences
  FROM public.notifications_preferences
  WHERE user_id = p_user_id;
  
  IF v_preferences IS NULL THEN
    INSERT INTO public.notifications_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_preferences;
  END IF;
  
  RETURN v_preferences;
END;
$$ LANGUAGE plpgsql;

-- Function para obter notificações não lidas
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM public.notifications_log
  WHERE user_id = p_user_id
  AND read_at IS NULL
  AND created_at > NOW() - interval '30 days';
$$ LANGUAGE sql;

-- Function para marcar notificação como lida
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.notifications_log
  SET read_at = NOW(),
      updated_at = NOW()
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function para marcar notificação como clicada
CREATE OR REPLACE FUNCTION mark_notification_as_clicked(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.notifications_log
  SET clicked_at = NOW(),
      read_at = COALESCE(read_at, NOW()),
      updated_at = NOW()
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;
