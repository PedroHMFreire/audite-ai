# Audite

Contagem de estoque para lojas de moda. O lojista importa a planilha do estoque,
bipa as peças com a câmera do celular e recebe o relatório do que falta e do que
sobra.

Aplicativo web (React + Vite + Tailwind) sobre Supabase (Postgres, autenticação
e Edge Functions). Cobrança por assinatura via Stripe.

## O que o produto faz

- Contagens com planilha do estoque (Excel ou CSV: código, nome, saldo).
- Leitura de código de barras pela câmera, ou digitação / leitor USB.
- Funciona sem internet durante a contagem e envia quando a conexão volta.
- Relatório de faltas, sobras e certos, com motivo por divergência, em PDF e Excel.
- Cronograma: categorias distribuídas pelas semanas, com início da contagem pelo calendário.
- Catálogo de produtos opcional, para mostrar o nome de códigos fora da planilha.
- Teste grátis de 7 dias e plano único mensal.
- Conta: dados da loja, senha, download dos próprios dados e exclusão da conta.

## Rodar localmente

Pré-requisitos: Node 22+, Docker e a [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
supabase start                       # banco, autenticação e funções locais (portas 55xxx)
supabase status -o env               # mostra API_URL e ANON_KEY locais
```

Crie `.env.localdb` com esses dois valores:

```
VITE_SUPABASE_URL=http://127.0.0.1:55321
VITE_SUPABASE_ANON_KEY=<ANON_KEY local>
```

```bash
npm run dev:local                    # http://localhost:5180, usando o banco local
```

`npm run dev` usa o `.env`, que aponta para o projeto Supabase de produção.

Para virar administrador de uma conta (libera Conta → Administração):

```sql
update public.user_roles set role = 'admin'
where user_id = (select id from auth.users where email = 'voce@exemplo.com');
```

## Testes

```bash
npm test             # unitários: planilhas, datas do cronograma, lógica de cobrança
npm run test:db      # regras de acesso do banco e funções do Stripe (exige supabase start)
npm run test:e2e     # navegador de ponta a ponta + acessibilidade
npm run test:all
```

Os testes de banco e de navegador rodam só contra o Supabase local e recusam
qualquer outro endereço.

Preparação para `test:db` e `test:e2e`:

```bash
printf 'STRIPE_WEBHOOK_SECRET=whsec_local_test_only\nSITE_URL=http://localhost:5180\n' > /tmp/functions.env
supabase functions serve --env-file /tmp/functions.env &
npx vite build --mode localdb --outDir dist-e2e
node tests/serve-dist.mjs dist-e2e 4180 &
```

`tests/serve-dist.mjs` serve o build com os mesmos cabeçalhos de segurança do
deploy, então a política de conteúdo (CSP) é testada de verdade.

`tests/migration-upgrade.sh` ensaia a subida das migrações sobre um banco que
já tem dados e confere que nada se perde. Ele recria o banco local.

## Banco de dados

- `supabase/migrations/` — fonte da verdade. A primeira migração é um baseline
  do schema de produção em 08/10/2026.
- `supabase/migrations_legacy/` — migrações e scripts antigos, só como histórico.
- `supabase/functions/` — funções do Stripe (`stripe-checkout`, `stripe-portal`,
  `stripe-webhook`).

Fluxo para mudar o schema:

```bash
supabase migration new nome_da_mudanca   # escreva o SQL
supabase migration up --local            # aplica no banco local
npm run test:db                          # confere as regras de acesso
tests/migration-upgrade.sh               # ensaia sobre dados existentes
supabase db push --dry-run               # mostra o que iria para produção
supabase db push                         # aplica em produção
```

As credenciais da CLI ficam em `.env.local` (`SUPABASE_ACCESS_TOKEN`,
`SUPABASE_DB_PASSWORD`), que não é versionado: `set -a; . ./.env.local; set +a`.

## Segurança

- Cada tabela tem Row Level Security: um cliente só lê e altera os próprios dados.
- Visitante sem login não tem permissão em nenhuma tabela.
- Teste e assinatura ficam na tabela `subscriptions`, que o navegador só lê.
  Sem acesso ativo o cliente consulta e exporta, mas o banco recusa criar ou
  editar contagens.
- Chaves do Stripe ficam apenas nos segredos do Supabase.
- Cabeçalhos de segurança (CSP, HSTS, frame-options) em `vercel.json`.
- Variáveis `VITE_*` são públicas: nunca coloque segredo nelas.

## Deploy

Site estático: `npm run build` gera `dist/`. Variáveis no provedor de hospedagem:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e, opcionalmente,
`VITE_PLAN_PRICE_LABEL` e `VITE_SUPPORT_EMAIL`.

Em outro provedor que não a Vercel, replique os cabeçalhos de `vercel.json` e a
regra que devolve `index.html` para qualquer rota.

No Supabase (Authentication → URL Configuration), o Site URL deve ser o domínio
do app e as Redirect URLs devem incluir `https://SEU-DOMINIO/**`.

## Documentos

- [docs/PLANO_LANCAMENTO.md](docs/PLANO_LANCAMENTO.md) — plano, estado e pendências.
- [docs/ATIVAR_COBRANCA_STRIPE.md](docs/ATIVAR_COBRANCA_STRIPE.md) — passo a passo da cobrança.
- [docs/arquivo/](docs/arquivo/) — documentos antigos.
