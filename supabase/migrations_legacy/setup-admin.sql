-- Script para criar o primeiro usuário administrador
-- Execute este script no SQL Editor do Supabase após o deploy

-- Substitua 'SEU_EMAIL_AQUI' pelo email do usuário que deve ser admin
-- Este usuário já deve ter feito signup no sistema

-- 1. Primeiro, vamos buscar o ID do usuário pelo email
-- SUBSTITUA 'admin@auditeai.com' pelo seu email real
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Busca o ID do usuário pelo email
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@auditeai.com'; -- SUBSTITUA ESTE EMAIL
    
    -- Verifica se o usuário foi encontrado
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Usuário não encontrado. Verifique se o email está correto e se o usuário já fez signup.';
    ELSE
        -- Cria ou atualiza o role do usuário para admin
        INSERT INTO public.user_roles (user_id, role, permissions)
        VALUES (
            admin_user_id,
            'admin',
            ARRAY[
                'view_admin_dashboard',
                'view_user_analytics', 
                'manage_users',
                'export_data',
                'view_financial_data',
                'manage_system'
            ]
        )
        ON CONFLICT (user_id) DO UPDATE SET
            role = 'admin',
            permissions = ARRAY[
                'view_admin_dashboard',
                'view_user_analytics',
                'manage_users', 
                'export_data',
                'view_financial_data',
                'manage_system'
            ],
            updated_at = now();
            
        RAISE NOTICE 'Usuário % foi promovido para admin com sucesso!', admin_user_id;
        
        -- Log da ação
        INSERT INTO public.admin_sessions (
            user_id,
            action,
            details,
            created_at
        ) VALUES (
            admin_user_id,
            'promoted_to_admin',
            jsonb_build_object('promoted_by', 'system_script'),
            now()
        );
    END IF;
END $$;

-- 2. Verifica se foi criado corretamente
SELECT 
    u.email,
    ur.role,
    ur.permissions,
    ur.created_at,
    ur.updated_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'admin';

-- 3. Atualiza cache de métricas para teste (opcional)
-- SELECT public.update_conversion_metrics_cache(
--     CURRENT_DATE - INTERVAL '30 days',
--     CURRENT_DATE
-- );

-- 4. Instruções finais
SELECT 'Setup admin completo! O usuário agora pode acessar /admin no sistema.' as status;