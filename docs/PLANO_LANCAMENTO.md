# Plano de lançamento — Audite

Objetivo: colocar o Audite à venda como SaaS na semana de 12/10/2026.
Produto: contagem de estoque fácil para o lojista de moda.

Decisões já tomadas (08/10/2026):

- Plano único, um usuário por loja. Equipes e múltiplas lojas ficam para depois do lançamento.
- Cobrança por Stripe. A estrutura fica pronta agora; as chaves entram no final.
- Landing refeita sem números ou depoimentos inventados. Minimalista e direta.
- Visual minimalista e sofisticado, intuitivo, simples e eficiente.
- Os dados dos perfis de teste em produção são preservados em todas as migrações.

## Como o trabalho é feito

- Branch `reforma-lancamento`. Nada vai para `main` nem para o GitHub sem revisão.
- Toda migração é escrita em `supabase/migrations/`, aplicada no banco local (Docker) e testada antes de ir para produção.
- O envio para produção (`supabase db push`) é feito pelo Pedro; ver "Pendências do Pedro".
- Para rodar os testes, ver o `README.md`.
- Os testes ponta a ponta rodam contra o banco local, nunca contra produção.
- Cada fase só é marcada como concluída com build passando e testes verdes.

## Fase 1 — Segurança e base

- [x] Convites: um usuário logado não lê mais convites de outras organizações.
- [x] Storage: removido o upload sem login no bucket `contagens`.
- [x] Perfil: o usuário não altera mais os próprios campos de assinatura e trial.
- [x] Trial definido pelo servidor (7 dias a partir do cadastro), não pelo navegador.
- [x] Função de e-mail sem autenticação removida (não estava publicada em produção).
- [x] Funções e permissões revisadas; visitante sem login não acessa nenhuma tabela.
- [x] Biblioteca `xlsx` vulnerável removida; leitura de planilha com limite de 10 MB e validação.
- [x] `.env` fora do versionamento.
- [x] Página de debug, `console.log` e código morto removidos (o código do app caiu de 18 mil para cerca de 8 mil linhas).
- [x] Cabeçalhos de segurança no deploy (CSP, HSTS, frame-options), testados no navegador.

## Fase 2 — Assinatura e trial (estrutura para o Stripe)

- [x] Tabela `subscriptions` com status, datas e identificadores do Stripe.
- [x] Regra única de acesso (`has_access`) aplicada no banco e no app.
- [x] Fim do trial: bloqueia criar e editar contagens; consulta e exportação continuam.
- [x] Tela "Assinatura": situação, dias restantes, assinar e gerenciar pagamento.
- [x] Funções do Stripe: checkout, portal do cliente e webhook com verificação de assinatura.
- [x] Sem chaves configuradas, o app mostra "assinatura em breve" em vez de quebrar.
- [x] Liberação manual de acesso pelo painel administrativo (para vender antes do Stripe).
- [x] Guia de ativação: [ATIVAR_COBRANCA_STRIPE.md](ATIVAR_COBRANCA_STRIPE.md).

## Fase 3 — Conta e itens legais

- [x] Recuperação de senha por e-mail e troca de senha na conta.
- [x] Cadastro trata os dois casos: com e sem confirmação de e-mail.
- [x] Termos de Uso e Política de Privacidade (LGPD), com links corretos.
- [x] Exclusão de conta e download dos próprios dados.

## Fase 4 — Visual e experiência

- [x] Sistema visual único: neutros quentes, tinta como única cor de ação, cor só para status.
- [x] Marca nova no logo, ícones do app e manifesto.
- [x] Navegação inferior no celular; cabeçalho enxuto.
- [x] Fluxo principal revisado: cadastro → contagem → leitura → conferência → relatório.
- [x] Estados vazios, de carregamento e de erro em todas as telas.
- [x] Acessibilidade: sem violações sérias no axe (WCAG 2.1 AA), zoom liberado, foco visível.
- [x] Landing nova, sem números ou depoimentos inventados.

## Fase 5 — Funcionalidades

- [x] Contagens: criar, importar planilha, digitar ou escanear, desfazer, finalizar, reabrir, renomear, arquivar, restaurar, excluir.
- [x] Relatório: abas de faltas, sobras e certos; motivo por divergência; PDF e Excel.
- [x] Cronograma em uma página só, com iniciar contagem, marcar como feita e pular.
- [x] Categorias com sugestões para loja de moda.
- [x] Catálogo de produtos sem precisar criar organização.
- [x] Painel administrativo: clientes e situação de acesso.
- [x] Contagem sem internet testada; leituras não duplicam ao reconectar.
- [x] Equipe, convites e múltiplas lojas saíram da interface (os dados continuam no banco).
- [ ] Notificações do cronograma: removidas. As tabelas nunca existiram em produção, então a tela só gerava erro. Fica para depois do lançamento.

## Fase 6 — Testes e verificação final

- [x] Build de produção sem erros de tipo.
- [x] Testes unitários: planilhas, datas do cronograma, lógica de cobrança.
- [x] Regras de acesso do banco: isolamento entre clientes, trial, assinatura, exclusão de conta.
- [x] Funções do Stripe com eventos simulados e assinados.
- [x] Ponta a ponta no navegador (celular), contra o build de produção com a CSP do deploy.
- [x] Acessibilidade automatizada em 16 telas.
- [x] Banco recriado do zero a partir das migrações.
- [x] Ensaio das migrações sobre um banco com dados antigos: nada se perde.

## Problemas encontrados que não estavam no plano

Todos corrigidos, exceto onde indicado.

- **O cronograma não funcionava em produção.** O app usava uma coluna (`archived_at`) e um status que nunca foram criados no banco. Corrigido pela migração `20261009000200`.
- **Datas do cronograma erradas no Brasil.** A conversão de fuso jogava as contagens para o dia e a semana errados. Corrigido e coberto por teste.
- **Planilha com "3,00" virava 300 peças.** O leitor apagava a vírgula. Corrigido, com testes para os formatos comuns.
- **Código com ponto, barra ou espaço era recusado** e derrubava a importação inteira. Agora é aceito.
- **Nomes com apóstrofo ou barra apareciam como `&#x27;`.** O texto era "escapado" antes de gravar. Corrigido; nomes já gravados assim continuam como estão.
- **Leitura offline podia contar em dobro** se a resposta do servidor se perdesse. Agora cada leitura tem identificador e o servidor ignora repetições.
- **Uma leitura recusada travava a fila offline para sempre**, e a contagem não finalizava mais. Agora é descartada com aviso.
- **O aviso de código desconhecido abria atrás do leitor de câmera**, invisível. Corrigido.
- **O painel inicial mostrava números inventados** ("+12% vs semana passada", metas fixas). Removido.
- **Textos com acentuação quebrada** ("sairÃ¡") em avisos. Corrigido.
- **A tela dizia "esta ação não poderá ser desfeita" ao finalizar**, mas a contagem pode ser reaberta. Corrigido.
- **Suporte, notificações e analytics gravavam em tabelas que não existem** em produção. Removidos.

## Decisões tomadas durante o trabalho

Reversíveis; avise se preferir diferente.

- **Sem modo escuro.** O app passou a ser só claro, para ter um visual único e bem testado.
- **Preço exibido: R$ 59 por mês.** É um valor provisório, tirado do antigo plano "Profissional". Muda pela variável `VITE_PLAN_PRICE_LABEL`.
- **Senha: mínimo de 8 caracteres, sem exigir maiúscula e símbolo.** Segue a recomendação atual (NIST) e facilita o cadastro.
- **Usuários que já existem ganham 14 dias de teste** a partir da migração. Contas de administrador têm acesso sempre.
- **Documentos antigos foram para `docs/arquivo/`** e os SQL soltos para `supabase/migrations_legacy/`. Nada foi apagado.

## Pendências do Pedro

Nesta ordem. O banco precisa ser atualizado **antes** de publicar o site novo.

1. **Backup do banco.** Supabase → Database → Backups, ou confirme que o backup diário está ativo.
2. **Aplicar as 4 migrações em produção.**
   ```bash
   set -a; . ./.env.local; set +a
   supabase db push --dry-run     # deve listar 20261009000000, ...0100, ...0200, ...0300
   supabase db push
   ```
3. **Autenticação no Supabase** (Authentication):
   - URL Configuration: Site URL com o domínio do app; Redirect URLs com `https://SEU-DOMINIO/**`. Sem isso o link de recuperação de senha não volta para o app.
   - Senha mínima de 8 caracteres.
   - Decidir se o cadastro exige confirmação de e-mail. O app funciona nos dois modos.
   - Traduzir os modelos de e-mail para português.
   - Configurar SMTP próprio. O envio padrão do Supabase tem limite baixo de e-mails por hora e não serve para produção.
4. **Publicar o site.** Revisar e mesclar a branch `reforma-lancamento`. Conferir no provedor as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (o `.env` não vai mais no repositório). Se a hospedagem não for a Vercel, replicar os cabeçalhos do `vercel.json`.
5. **Testar o leitor de código de barras em um celular de verdade.** É a única parte que não dá para automatizar.
6. **Definir o preço** e ajustar `VITE_PLAN_PRICE_LABEL`.
7. **Ativar o Stripe**, seguindo [ATIVAR_COBRANCA_STRIPE.md](ATIVAR_COBRANCA_STRIPE.md). Até lá, libere acessos em Conta → Administração.
8. **Revisão jurídica dos Termos e da Política de Privacidade.** Os textos foram escritos com cuidado, mas não substituem um advogado. Falta incluir razão social, CNPJ e endereço da empresa.
9. **Apagar a "secret key"** criada no painel do Supabase, se não tiver uso.

## Depois do lançamento

- Equipe: várias pessoas contando a mesma loja, e múltiplas lojas por conta.
- E-mail avisando que o teste está acabando.
- Lembretes do cronograma.
- Atualizar a dependência `uuid` usada pelo `exceljs` (alerta moderado do `npm audit`; o trecho afetado não é usado pelo app).

## Estado

Atualizado em 09/10/2026. Todo o trabalho está na branch `reforma-lancamento`, em commits locais; nada foi enviado ao GitHub nem aplicado em produção além do acerto do histórico de migrações feito em 08/10.
