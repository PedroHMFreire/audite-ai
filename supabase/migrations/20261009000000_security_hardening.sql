-- Endurecimento de segurança para o lançamento.
-- Não altera nem remove dados de clientes.

-- 1. Storage: o bucket "contagens" aceitava upload de qualquer pessoa, sem login.
--    O app não usa esse bucket; a policy é removida e nenhuma outra é criada,
--    então só o service_role consegue gravar nele.
DROP POLICY IF EXISTS "Permitir upload para todos 1s8edci_0" ON storage.objects;

-- 2. Convites: qualquer usuário logado conseguia listar os convites (com token)
--    de todas as organizações. A leitura passa a ser só do admin da organização
--    (policy "admin manages invitations") e a prévia pública vira uma função
--    que exige conhecer o token.
DROP POLICY IF EXISTS "authenticated reads invitation" ON public.organization_invitations;

CREATE OR REPLACE FUNCTION public.get_invitation_preview(p_token uuid)
RETURNS TABLE (org_name text, expires_at timestamptz, is_valid boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT o.name,
         i.expires_at,
         (i.accepted_at IS NULL AND i.expires_at > now())
  FROM public.organization_invitations i
  JOIN public.organizations o ON o.id = i.org_id
  WHERE i.token = p_token;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_preview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_preview(uuid) TO anon, authenticated, service_role;

-- 3. Perfil: o usuário podia gravar qualquer coluna da própria linha, inclusive
--    as de plano e trial. Passa a poder alterar só os dados cadastrais.
--    A criação do perfil é feita pelo trigger de cadastro; apagar o perfil
--    deixa de ser permitido (a exclusão de conta tem função própria).
INSERT INTO public.user_profiles (id)
SELECT u.id FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = u.id);

DROP POLICY IF EXISTS "user_profiles-insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles-delete" ON public.user_profiles;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.user_profiles FROM anon, authenticated;
GRANT UPDATE (store_name, owner_name, phone, segment, updated_at)
  ON public.user_profiles TO authenticated;

-- 4. Papéis: só leitura para o próprio usuário; nenhuma escrita pelo cliente.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.user_roles FROM anon, authenticated;

-- 5. Visitante sem login não acessa nenhuma tabela nem função do schema public.
--    (As policies já barravam; isto remove a permissão na origem.)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
GRANT EXECUTE ON FUNCTION public.get_invitation_preview(uuid) TO anon;

-- 6. Status de contagem: o padrão da coluna ("EM ANDAMENTO") não batia com o
--    valor que o app grava ("em_andamento").
--    Só o padrão muda; linhas existentes não são tocadas.
ALTER TABLE public.counts ALTER COLUMN status SET DEFAULT 'em_andamento';
