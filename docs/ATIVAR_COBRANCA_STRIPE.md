# Ativar a cobrança pelo Stripe

O app já está pronto para cobrar. Enquanto as chaves não forem configuradas,
o botão "Assinar" mostra "a assinatura online estará disponível em breve" e
você libera acessos manualmente em **Conta → Administração**.

Tempo estimado: 30 minutos. Faça tudo primeiro no **modo de teste** do Stripe.

## 1. No Stripe

1. **Produto e preço.** Catálogo de produtos → Adicionar produto.
   Nome "Audite", preço recorrente mensal em BRL. Copie o id do preço (`price_...`).
2. **Formas de pagamento.** Configurações → Formas de pagamento. Cartão já vem
   ligado. Para outras formas, confira no próprio Stripe quais aceitam
   cobrança recorrente na sua conta antes de ativar.
3. **Portal do cliente.** Configurações → Billing → Portal do cliente. Ative
   "cancelar assinatura" e "atualizar forma de pagamento" e salve. Sem isso o
   botão "Gerenciar pagamento" dá erro.
4. **Chave secreta.** Desenvolvedores → Chaves de API → chave secreta (`sk_test_...`
   no modo de teste, `sk_live_...` em produção).

## 2. Publicar as funções no Supabase

No terminal, na pasta do projeto:

```bash
set -a; . ./.env.local; set +a

supabase functions deploy stripe-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-webhook
```

## 3. Criar o webhook no Stripe

Desenvolvedores → Webhooks → Adicionar endpoint.

- URL: `https://rwbomcidvezohsgojbgz.supabase.co/functions/v1/stripe-webhook`
- Eventos:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Depois de criar, copie o **segredo de assinatura** do endpoint (`whsec_...`).

## 4. Gravar os segredos no Supabase

As chaves ficam só no servidor. Nunca as coloque em `.env` nem em variável `VITE_`.

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_PRICE_ID=price_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  SITE_URL=https://SEU-DOMINIO
```

`SITE_URL` é o endereço público do app, sem barra no fim. É para onde o Stripe
devolve o cliente depois do pagamento.

## 5. Ajustar o valor exibido

O valor mostrado na landing e na tela de assinatura vem da variável
`VITE_PLAN_PRICE_LABEL` no provedor de hospedagem (padrão: `R$ 59`). Deixe igual
ao preço criado no Stripe e publique o site de novo.

## 6. Testar

1. Crie uma conta nova no app.
2. Conta → Assinatura → Assinar. Use o cartão de teste `4242 4242 4242 4242`,
   qualquer validade futura e qualquer CVC.
3. Ao voltar, a tela deve mostrar "Assinatura ativa" em alguns segundos.
4. "Gerenciar pagamento" deve abrir o portal do Stripe. Cancele por lá e
   confira que o app mostra "Assinatura cancelada. Seu acesso continua até…".
5. No Stripe, em Webhooks, todos os eventos devem aparecer com resposta 200.

## 7. Ir para produção

Repita os passos 1, 3 e 4 com o Stripe em modo de produção (produto, preço,
webhook e chaves são separados entre teste e produção).

## Como funciona

| Situação no Stripe | No app |
|---|---|
| `active` | Acesso liberado |
| `past_due` (cobrança falhou, Stripe tentando de novo) | Acesso mantido, com aviso |
| `canceled` com período já pago | Acesso até o fim do período |
| `canceled` vencida, `unpaid`, `incomplete` | Só consulta; não cria nem edita contagens |

O webhook confere a assinatura de cada evento, ignora eventos repetidos e é a
única coisa que altera a tabela `subscriptions`. O navegador nunca consegue
mudar a própria assinatura.

Se um cliente pagar e o acesso não liberar: veja a resposta do evento em
Stripe → Webhooks e os logs em Supabase → Edge Functions → `stripe-webhook`.
Enquanto resolve, libere o acesso manualmente em Conta → Administração.
