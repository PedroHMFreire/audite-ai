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
- Os testes ponta a ponta rodam contra o banco local, nunca contra produção.
- Cada fase só é marcada como concluída com build passando e testes verdes.

## Fase 1 — Segurança e base

- [ ] Convites: impedir que um usuário logado leia convites de outras organizações.
- [ ] Storage: remover o upload sem login no bucket `contagens`.
- [ ] Perfil: impedir que o usuário altere os próprios campos de assinatura e trial.
- [ ] Trial definido pelo servidor (data de início e fim), não pelo navegador.
- [ ] Função de e-mail: exigir chamada autenticada e restringir a origem.
- [ ] Revisar todas as funções `SECURITY DEFINER` e permissões de execução.
- [ ] Trocar a biblioteca `xlsx` vulnerável; validar tamanho e tipo dos arquivos enviados.
- [ ] Tirar `.env` do versionamento.
- [ ] Remover página de debug, `console.log` e código morto.
- [ ] Cabeçalhos de segurança no deploy (CSP, HSTS, frame-options).

## Fase 2 — Assinatura e trial (estrutura para o Stripe)

- [ ] Modelo de assinatura no banco: status, datas, identificadores do Stripe.
- [ ] Regra única de acesso ("tem direito de usar?") aplicada no banco e no app.
- [ ] Fim do trial: o app bloqueia a criação de novas contagens e leva à tela de assinatura; os dados continuam acessíveis para leitura.
- [ ] Tela "Assinatura": status, dias restantes, botão de assinar e de gerenciar.
- [ ] Funções de servidor do Stripe: criar checkout, portal do cliente, webhook.
- [ ] Sem chaves configuradas, o app mostra "assinatura em breve" em vez de quebrar.
- [ ] Documento de ativação: quais chaves criar no Stripe e onde colocá-las.

## Fase 3 — Conta e itens legais

- [ ] Recuperação de senha ("esqueci minha senha") e troca de senha.
- [ ] Confirmação de e-mail tratada no cadastro.
- [ ] Páginas de Termos de Uso e Política de Privacidade (LGPD), com links corretos.
- [ ] Exclusão de conta e exportação dos dados pelo próprio usuário.

## Fase 4 — Visual e experiência

- [ ] Sistema visual único: paleta neutra com um só tom de destaque, tipografia, espaçamentos, botões, campos e cartões.
- [ ] Identidade coerente: logo, ícones do app, cores do PWA e do navegador.
- [ ] Navegação simplificada, pensada primeiro para celular.
- [ ] Fluxo principal revisado tela a tela: cadastro → primeira contagem → leitura por código de barras → conferência → relatório.
- [ ] Estados vazios, de carregamento e de erro claros em todas as telas.
- [ ] Acessibilidade: contraste, foco visível, áreas de toque, zoom liberado.
- [ ] Landing nova: o que é, como funciona, preço, perguntas frequentes, chamada para o teste grátis.

## Fase 5 — Funcionalidades

- [ ] Contagens: criar, importar planilha, digitar ou escanear, finalizar, reabrir, excluir.
- [ ] Relatório: divergências, justificativas, exportação em PDF e Excel.
- [ ] Categorias, cronograma e calendário.
- [ ] Catálogo de produtos.
- [ ] Notificações e preferências.
- [ ] Painel administrativo (uso interno).
- [ ] Funcionamento offline e instalação como app (PWA).
- [ ] Ocultar do plano único o que depende de equipe e múltiplas lojas.

## Fase 6 — Testes e verificação final

- [ ] Build de produção sem erros de tipo.
- [ ] Testes unitários da lógica de contagem.
- [ ] Testes ponta a ponta no navegador (desktop e celular) cobrindo o fluxo principal, trial expirado e isolamento entre dois clientes.
- [ ] Testes das regras de acesso do banco (um cliente não lê nem altera dados de outro).
- [ ] Recriação do banco do zero a partir das migrações.
- [ ] Revisão final de textos em português.

## Pendências do Pedro

Preenchidas ao longo do trabalho; ver a seção "Estado" abaixo.

## Estado

Atualizado a cada fase concluída.
