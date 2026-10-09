import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Check, ScanBarcode, Volume2, WifiOff, X } from 'lucide-react'
import PublicLayout from '@/components/PublicLayout'
import { PLAN } from '@/lib/plan'

const STEPS: [string, string][] = [
  ['Bipe as peças', 'Aponte a câmera para as etiquetas. Cada leitura entra na lista sozinha, sem digitar e sem tocar em nada.'],
  ['Suba a planilha', 'Exporte o estoque do seu sistema em Excel ou CSV, com código, nome e saldo de cada peça.'],
  ['Receba o relatório', 'O Audite cruza o que foi bipado com o saldo do sistema e mostra o que bateu, o que falta e o que sobra.'],
]

const BEFORE = [
  'Bipar com o coletor e juntar os códigos no bloco de notas',
  'Levar o arquivo para o computador e subir no sistema',
  'Conferir linha por linha o que não bateu',
]

const AFTER = [
  'Bipar com o celular: cada leitura já fica salva',
  'Tocar em Finalizar para cruzar com a planilha do estoque',
  'Receber o relatório de faltas e sobras em PDF ou Excel',
]

const FEATURES = [
  { icon: WifiOff, title: 'Funciona sem internet', text: 'Se o sinal cair no estoque, as leituras ficam guardadas no aparelho e sobem quando a conexão voltar.' },
  { icon: Volume2, title: 'Avisa na hora', text: 'Som e vibração a cada bipe, com um alerta diferente quando o código não está na planilha.' },
  { icon: ScanBarcode, title: 'Leitor que você já tem', text: 'Prefere um leitor USB? Também funciona, assim como digitar o código.' },
  { icon: CalendarDays, title: 'Cronograma por categoria', text: 'Divida o estoque por categoria e programe as contagens da semana no calendário.' },
]

const FAQ: [string, string][] = [
  ['Preciso de leitor de código de barras?', 'Não. A câmera do celular faz a leitura. Se preferir, também dá para digitar os códigos ou usar um leitor que você já tenha.'],
  ['Funciona com o meu sistema de loja?', 'O Audite não se conecta ao seu sistema. Ele trabalha com a planilha de estoque que praticamente todo sistema exporta, em Excel ou CSV.'],
  ['Que planilha eu preciso ter?', 'Uma exportação do estoque com três colunas: código, nome do produto e saldo. É com ela que o Audite compara o que você contou.'],
  ['O que acontece quando o teste acaba?', 'Suas contagens e relatórios continuam disponíveis para consulta. Para fazer novas contagens, é só assinar.'],
  ['Posso cancelar quando quiser?', 'Sim, direto na tela de assinatura, sem multa. O acesso segue até o fim do mês já pago.'],
]

const H2 = 'font-display text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl'

export default function Landing() {
  return (
    <PublicLayout>
      {/* Abertura */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_60%_at_78%_35%,rgb(var(--brand)/0.16),transparent_70%)]"
          aria-hidden="true"
        />
        <div className="container-safe relative grid items-center gap-12 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              Contagem de estoque para lojas de moda
            </p>
            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[0.98] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
              O balanço da loja, <span className="text-brand-text">sem bloco de notas.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600">
              Aponte o celular para as etiquetas e cada bipe entra na lista sozinho. No final, o Audite cruza com o
              seu sistema e mostra, peça por peça, o que falta e o que sobra.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/cadastro" className="btn btn-lg rounded-xl">
                Testar grátis por {PLAN.trialDays} dias
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <p className="text-sm text-zinc-500">Sem cartão de crédito.</p>
            </div>
          </div>
          <ScannerPreview />
        </div>
      </section>

      {/* Antes e depois */}
      <section className="container-safe pb-20 lg:pb-28">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 p-6 sm:p-8">
            <h2 className="text-sm font-medium text-zinc-500">Como muita loja faz hoje</h2>
            <ul className="mt-5 space-y-4">
              {BEFORE.map((item) => (
                <li key={item} className="flex items-start gap-3 text-zinc-600">
                  <X className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-brand p-6 text-brand-on sm:p-8">
            <h2 className="text-sm font-medium text-brand-on">Com o Audite</h2>
            <ul className="mt-5 space-y-4">
              {AFTER.map((item) => (
                <li key={item} className="flex items-start gap-3 font-medium">
                  <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-y border-zinc-200 bg-white">
        <div className="container-safe grid gap-12 py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div>
            <h2 className={H2}>Três passos. Um celular.</h2>
            <ol className="mt-10 space-y-8">
              {STEPS.map(([title, text], i) => (
                <li key={title} className="flex gap-5">
                  <span className="tabular flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-display text-lg font-bold text-brand-text">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="mt-1.5 leading-relaxed text-zinc-600">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <ReportPreview />
        </div>
      </section>

      {/* O que mais vem junto */}
      <section className="container-safe py-20 lg:py-24">
        <h2 className={`${H2} max-w-2xl`}>Feito para o estoque de verdade.</h2>
        <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon className="h-6 w-6 text-brand-text" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Preço */}
      <section className="border-y border-zinc-200 bg-white">
        <div className="container-safe grid items-center gap-10 py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div>
            <h2 className={H2}>Um plano. Tudo incluído.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-zinc-600">
              Sem limite de contagens, sem taxa de instalação, sem fidelidade. Você testa por {PLAN.trialDays} dias e
              só assina se fizer sentido para a sua loja.
            </p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-paper p-6 sm:p-8">
            <p className="flex items-baseline gap-2">
              <span className="tabular font-display text-6xl font-extrabold tracking-tight">{PLAN.priceLabel}</span>
              <span className="text-zinc-500">{PLAN.period}</span>
            </p>
            <ul className="mt-6 space-y-3">
              {PLAN.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-zinc-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-text" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/cadastro" className="btn btn-lg mt-8 w-full rounded-xl">Começar o teste grátis</Link>
          </div>
        </div>
      </section>

      {/* Perguntas */}
      <section className="container-safe grid gap-10 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-24">
        <h2 className={H2}>Perguntas frequentes</h2>
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
      </section>

      {/* Fechamento */}
      <section className="container-safe pb-20 lg:pb-24">
        <div className="flex flex-col items-start gap-8 rounded-[2rem] bg-brand p-8 text-brand-on sm:p-12 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="max-w-2xl font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-brand-on sm:text-5xl">
            Faça a próxima contagem com o Audite.
          </h2>
          <Link to="/cadastro" className="btn btn-lg light-palette shrink-0 rounded-xl bg-white text-ink hover:bg-zinc-100 active:bg-zinc-200">
            Testar grátis por {PLAN.trialDays} dias
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}

const BARS = [3, 1, 2, 1, 1, 3, 2, 1, 3, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 1, 2]

/** Ilustração do bipe em sequência no celular, com dados de exemplo. Sempre escura, como a tela do leitor. */
function ScannerPreview() {
  const reads: [string, string, number][] = [
    ['Vestido midi linho', '7891000100103', 4],
    ['Camisa seda off-white', '7891000100104', 5],
    ['Calça alfaiataria preta', '7891000100105', 6],
    ['Blazer lã cinza', '7891000100106', 2],
  ]
  return (
    <div className="mx-auto w-full max-w-[19rem]" role="img" aria-label="Exemplo do celular bipando: a câmera lê a etiqueta e as peças aparecem em lista.">
      <div className="light-palette overflow-hidden rounded-[2.25rem] border-[6px] border-zinc-900 bg-zinc-950 text-white shadow-2xl" aria-hidden="true">
        <div className="relative flex h-40 items-center justify-center bg-zinc-800">
          <div className="flex h-16 items-stretch gap-[3px] rounded-md bg-white px-4 py-2.5">
            {BARS.map((w, i) => (
              <span key={i} className="bg-zinc-950" style={{ width: w * 1.5 }} />
            ))}
          </div>
          <span className="animate-scan-beam absolute inset-x-8 top-1/2 h-0.5 rounded-full bg-brand shadow-[0_0_14px_2px_rgb(var(--brand)/0.9)]" />
        </div>
        <div className="flex items-baseline gap-1.5 border-b border-white/10 px-4 py-3">
          <span className="tabular text-2xl font-semibold">17</span>
          <span className="text-sm text-white/70">peças bipadas</span>
        </div>
        <ul className="divide-y divide-white/10">
          {reads.map(([nome, codigo, total], i) => (
            <li
              key={codigo}
              className={`animate-fade-in flex items-center gap-3 px-4 py-2.5 ${i === 0 ? 'bg-white/10' : ''}`}
              style={{ animationDelay: `${(reads.length - i) * 180}ms` }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{nome}</p>
                <p className="tabular font-mono text-[11px] text-white/60">{codigo}</p>
              </div>
              <span className="tabular shrink-0 text-sm text-white/70">{total} un</span>
            </li>
          ))}
        </ul>
        <div className="px-4 pb-4 pt-3">
          <div className="rounded-xl bg-white py-2.5 text-center text-sm font-medium text-zinc-900">Concluir</div>
        </div>
      </div>
    </div>
  )
}

/** Ilustração do relatório, com dados de exemplo. */
function ReportPreview() {
  const rows: [string, string, number, number][] = [
    ['Vestido midi linho', '7891000100103', 4, 4],
    ['Camisa seda off-white', '7891000100104', 5, 6],
    ['Calça alfaiataria preta', '7891000100105', 6, 5],
    ['Blazer lã cinza', '7891000100106', 2, 2],
  ]
  return (
    <div className="w-full self-center" role="img" aria-label="Exemplo do relatório: quatro peças, uma com falta e uma com sobra.">
      <div className="rounded-3xl border border-zinc-200 bg-paper p-5 sm:p-6" aria-hidden="true">
        <div className="flex items-baseline justify-between">
          <p className="font-medium">Balanço de outubro</p>
          <p className="text-xs text-zinc-500">exemplo</p>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[['Certos', '2', 'bg-green-500'], ['Faltas', '1', 'bg-red-500'], ['Sobras', '1', 'bg-amber-500']].map(([l, v, dot]) => (
            <div key={l} className="rounded-xl bg-white p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-zinc-500"><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{l}</p>
              <p className="tabular mt-1 text-2xl font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <ul className="mt-5 divide-y divide-zinc-200">
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
