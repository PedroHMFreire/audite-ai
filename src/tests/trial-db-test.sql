-- Script para testar e corrigir a lógica de trial

-- 1. Verificar função atual
SELECT routines.routine_name, routines.routine_definition 
FROM information_schema.routines 
WHERE routines.routine_name = 'handle_new_user';

-- 2. Recriar a função corrigida
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    store_name,
    owner_name,
    phone,
    segment,
    plan,
    trial_start,
    trial_end,
    trial_active,
    subscription_status
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'store_name',
    NEW.raw_user_meta_data->>'owner_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'segment',
    NEW.raw_user_meta_data->>'plan',
    (NEW.raw_user_meta_data->>'trial_start')::timestamp with time zone,
    (NEW.raw_user_meta_data->>'trial_end')::timestamp with time zone,
    COALESCE((NEW.raw_user_meta_data->>'trial_active')::boolean, true),
    COALESCE(NEW.raw_user_meta_data->>'subscription_status', 'trial')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verificar se o trigger existe
SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';

-- 4. Recriar o trigger se necessário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Verificar usuários existentes sem perfil
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE WHEN up.id IS NULL THEN 'SEM PERFIL' ELSE 'COM PERFIL' END as status_perfil
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
ORDER BY au.created_at DESC;

-- 6. Verificar perfis de trial existentes
SELECT 
  up.*,
  CASE 
    WHEN up.trial_end > NOW() AND up.trial_active = true THEN 'ATIVO'
    WHEN up.trial_end <= NOW() THEN 'EXPIRADO'
    ELSE 'INATIVO'
  END as trial_status,
  EXTRACT(DAY FROM (up.trial_end - NOW())) as dias_restantes
FROM public.user_profiles up
WHERE up.subscription_status = 'trial'
ORDER BY up.created_at DESC;

-- 7. Função para testar cálculo de dias
SELECT 
  NOW() as data_atual,
  NOW() + INTERVAL '7 days' as data_fim_trial,
  EXTRACT(DAY FROM (NOW() + INTERVAL '7 days' - NOW())) as dias_diferenca,
  CEIL(EXTRACT(EPOCH FROM (NOW() + INTERVAL '7 days' - NOW())) / 86400) as dias_ceil;