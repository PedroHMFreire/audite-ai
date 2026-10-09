/**
 * Dados comerciais do plano único. O valor exibido vem de variável de
 * ambiente para poder mudar sem alterar código; a cobrança real é a do
 * preço configurado no Stripe.
 */
export const PLAN = {
  name: 'Audite',
  priceLabel: (import.meta.env.VITE_PLAN_PRICE_LABEL as string | undefined) || 'R$ 59',
  period: 'por mês',
  trialDays: 7,
  features: [
    'Contagens ilimitadas',
    'Leitura de código de barras pela câmera do celular',
    'Importação da planilha de estoque (Excel ou CSV)',
    'Relatório de faltas e sobras em PDF e Excel',
    'Cronograma de contagens por categoria',
    'Funciona sem internet durante a contagem',
  ],
} as const

export const SUPPORT_EMAIL =
  (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || 'contato@rakaimidia.com'

export const COMPANY_NAME = 'Rakai Mídia'
