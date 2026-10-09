import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import PublicLayout from '@/components/PublicLayout'
import { PLAN } from '@/lib/plan'

const STEPS: [string, string][] = [
  ['Importe a planilha', 'Exporte o estoque do seu sistema em Excel ou CSV. O Audite lê código, nome e saldo de cada peça.'],
  ['Bipe as peças', 'A câmera do celular vira leitor de código de barras. Se o sinal cair no estoque, a contagem continua.'],
  ['Veja as diferenças', 'Na hora de fechar, o relatório mostra o que bateu, o que está faltando e o que está sobrando.'],
]

const FAQ: [string, string][] = [
  ['Preciso de leitor de código de barras?', 'Não. A câmera do celular faz a leitura. Se preferir, também dá para digitar os códigos ou usar um leitor que você já tenha.'],
  ['Funciona com o meu sistema de loja?', 'O Audite não se conecta ao seu sistema. Ele trabalha com a planilha de estoque que praticamente todo sistema exporta, em Excel ou CSV.'],
  ['Que planilha eu preciso ter?', 'Uma exportação do estoque com três colunas: código, nome do produto e saldo. É com ela que o Audite compara o que você contou.'],
  ['O que acontece quando o teste acaba?', 'Suas contagens e relatórios continuam disponíveis para consulta. Para fazer novas contagens, é só assinar.'],
  ['Posso cancelar quando quiser?', 'Sim, direto na tela de assinatura, sem multa. O acesso segue até o fim do mês já pago.'],
]

export default function Landing() {
  return (
    <PublicLayout>
      {/* Abertura */}
      <section className="container-safe grid items-center gap-12 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pb-28 lg:pt-24">
        <div>
          <p className="eyebrow">Contagem de estoque para lojas de moda</p>
          <h1 className="mt-4 font-display text-5xl font-normal leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Saiba exatamente o que tem na sua loja.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600">
            Bipe as peças com o celular. O Audite compara com o seu sistema e mostra, peça por peça, o que falta e o
            que sobra.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/cadastro" className="btn btn-lg">
              Testar grátis por {PLAN.trialDays} dias
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="text-sm text-zinc-500">Sem cartão de crédito.</p>
          </div>
        </div>
        <ProductPreview />
      </section>

      {/* Como funciona */}
      <section className="border-y border-zinc-200 bg-white">
        <div className="container-safe py-20 lg:py-24">
          <h2 className="font-display text-4xl font-normal sm:text-5xl">Três passos. Um celular.</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="border-t border-ink pt-5">
                <span className="tabular text-sm text-zinc-500">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-2 leading-relaxed text-zinc-600">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Preço */}
      <section className="container-safe py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-4xl font-normal sm:text-5xl">Um plano. Tudo incluído.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-zinc-600">
              Sem limite de contagens, sem taxa de instalação, sem fidelidade. Você testa por {PLAN.trialDays} dias e
              só assina se fizer sentido para a sua loja.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
            <p className="flex items-baseline gap-2">
              <span className="tabular font-display text-6xl font-normal">{PLAN.priceLabel}</span>
              <span className="text-zinc-500">{PLAN.period}</span>
            </p>
            <ul className="mt-6 space-y-3">
              {PLAN.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-zinc-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/cadastro" className="btn btn-lg mt-8 w-full">Começar o teste grátis</Link>
          </div>
        </div>
      </section>

      {/* Perguntas */}
      <section className="border-t border-zinc-200 bg-white">
        <div className="container-safe grid gap-10 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-24">
          <h2 className="font-display text-4xl font-normal sm:text-5xl">Perguntas frequentes</h2>
          <div className="divide-y divide-zinc-200 border-y border-zinc-200">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium marker:hidden">
                  {q}
                  <span className="text-2xl font-light text-zinc-500 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-zinc-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Fechamento */}
      <section className="bg-ink text-paper">
        <div className="container-safe flex flex-col items-start gap-8 py-20 lg:flex-row lg:items-end lg:justify-between lg:py-24">
          <h2 className="max-w-2xl font-display text-4xl font-normal leading-tight text-paper sm:text-5xl">
            Faça a próxima contagem com o Audite.
          </h2>
          <Link to="/cadastro" className="btn btn-lg shrink-0 bg-paper text-ink hover:bg-zinc-200 active:bg-zinc-300">
            Testar grátis por {PLAN.trialDays} dias
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}

/** Ilustração da tela de contagem, com dados de exemplo. */
function ProductPreview() {
  const rows: [string, string, number, number][] = [
    ['Vestido midi linho', '7891000100103', 4, 4],
    ['Camisa seda off-white', '7891000100104', 5, 6],
    ['Calça alfaiataria preta', '7891000100105', 6, 5],
    ['Blazer lã cinza', '7891000100106', 2, 2],
  ]
  return (
    <div className="mx-auto w-full max-w-sm lg:max-w-none" role="img" aria-label="Exemplo da tela de conferência: quatro peças, uma com falta e uma com sobra.">
      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-lg sm:p-6" aria-hidden="true">
        <div className="flex items-baseline justify-between">
          <p className="font-medium">Balanço de outubro</p>
          <p className="text-xs text-zinc-500">exemplo</p>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[['Certos', '2', 'bg-green-500'], ['Faltas', '1', 'bg-red-500'], ['Sobras', '1', 'bg-amber-500']].map(([l, v, dot]) => (
            <div key={l} className="rounded-xl bg-zinc-50 p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-zinc-500"><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{l}</p>
              <p className="tabular mt-1 text-2xl font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <ul className="mt-5 divide-y divide-zinc-100">
          {rows.map(([nome, codigo, contado, sistema]) => {
            const diff = contado - sistema
            return (
              <li key={codigo} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{nome}</p>
                  <p className="tabular font-mono text-[11px] text-zinc-500">{codigo}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm">{contado} <span className="text-zinc-500">de {sistema}</span></p>
                  <p className={`text-[11px] font-medium ${diff === 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {diff === 0 ? 'Certo' : diff < 0 ? `Falta ${-diff}` : `Sobra ${diff}`}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
