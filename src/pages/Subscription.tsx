import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { BillingNotConfiguredError, openBillingPortal, startCheckout } from '@/lib/billing'
import { PLAN, SUPPORT_EMAIL } from '@/lib/plan'
import { daysUntil, useAccess } from '@/contexts'
import { useToast } from '@/components/Toast'

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''

export default function Subscription() {
  const { access, loading, refresh } = useAccess()
  const { addToast } = useToast()
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  // Volta do checkout do Stripe: o webhook pode levar alguns segundos.
  useEffect(() => {
    const result = params.get('checkout')
    if (!result) return
    setParams({}, { replace: true })
    if (result !== 'sucesso') return
    addToast({ type: 'success', message: 'Pagamento recebido', description: 'Estamos ativando sua assinatura.' })
    let tries = 0
    const timer = setInterval(async () => {
      tries += 1
      await refresh()
      if (tries >= 8) clearInterval(timer)
    }, 2500)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (err) {
      if (err instanceof BillingNotConfiguredError) setUnavailable(true)
      else addToast({ type: 'error', message: err instanceof Error ? err.message : 'Tente novamente.' })
      setBusy(false)
    }
  }

  if (loading) return <div className="mx-auto max-w-2xl"><div className="skeleton h-64" aria-busy="true" /></div>

  const status = access?.status
  const subscribed = status === 'active' || status === 'past_due' || (status === 'canceled' && access?.has_access)
  const trialDays = daysUntil(access?.trial_ends_at)

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="page-title">Assinatura</h1>
        <p className="page-subtitle">{headline()}</p>
      </header>

      {status === 'past_due' && (
        <p role="alert" className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Não conseguimos cobrar seu cartão. Atualize a forma de pagamento para não perder o acesso.
        </p>
      )}

      <section className="card" aria-labelledby="plano">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="plano" className="text-base font-semibold">Plano {PLAN.name}</h2>
          <p className="text-sm text-zinc-500">
            <span className="tabular text-2xl font-semibold text-ink">{PLAN.priceLabel}</span> {PLAN.period}
          </p>
        </div>
        <ul className="mt-5 space-y-2.5">
          {PLAN.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-zinc-200 pt-5">
          {access?.is_admin || status === 'comp' ? (
            <p className="text-sm text-zinc-600">
              Seu acesso está liberado{access?.current_period_end ? ` até ${fmt(access.current_period_end)}` : ''}. Não há cobrança.
            </p>
          ) : subscribed ? (
            <div className="space-y-3">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => run(openBillingPortal)}>
                {busy ? 'Abrindo…' : 'Gerenciar pagamento'}
              </button>
              <p className="text-xs text-zinc-500">Trocar cartão, ver faturas ou cancelar. Você é levado ao ambiente seguro do Stripe.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <button type="button" className="btn btn-lg w-full sm:w-auto" disabled={busy || unavailable} onClick={() => run(startCheckout)}>
                {busy ? 'Abrindo pagamento…' : `Assinar por ${PLAN.priceLabel} ${PLAN.period}`}
              </button>
              <p className="text-xs text-zinc-500">Pagamento processado pelo Stripe. Cancele quando quiser, sem multa.</p>
            </div>
          )}

          {unavailable && (
            <p role="status" className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              A assinatura online estará disponível em breve. Para assinar agora, escreva para{' '}
              <a className="link" href={`mailto:${SUPPORT_EMAIL}?subject=Quero assinar o Audite`}>{SUPPORT_EMAIL}</a>.
            </p>
          )}
        </div>
      </section>
    </div>
  )

  function headline(): string {
    if (!access || !status) return ''
    if (access.is_admin) return 'Conta de administrador.'
    if (status === 'trialing') {
      return access.has_access
        ? `Você está no período de teste. ${trialDays === 1 ? 'Falta 1 dia' : `Faltam ${trialDays} dias`}, até ${fmt(access.trial_ends_at)}.`
        : 'Seu período de teste terminou. Assine para voltar a contar; seus dados continuam guardados.'
    }
    if (status === 'active') {
      return access.cancel_at_period_end
        ? `Assinatura cancelada. Seu acesso continua até ${fmt(access.current_period_end)}.`
        : `Assinatura ativa. Próxima cobrança em ${fmt(access.current_period_end)}.`
    }
    if (status === 'past_due') return 'Pagamento pendente.'
    if (status === 'canceled') {
      return access.has_access
        ? `Assinatura cancelada. Seu acesso continua até ${fmt(access.current_period_end)}.`
        : 'Sua assinatura foi encerrada. Assine de novo para voltar a contar.'
    }
    if (status === 'comp') return 'Acesso liberado.'
    return 'Sua assinatura está inativa.'
  }
}
