import { SUPPORT_EMAIL } from '@/lib/plan'

const FAQ: [string, string][] = [
  ['Como começo uma contagem?', 'No Início, dê um nome e toque em Começar. Importe a planilha do estoque e comece a bipar as peças. Ao terminar, toque em Finalizar para ver o relatório.'],
  ['Que planilha eu preciso importar?', 'Uma exportação do seu sistema de estoque em Excel (.xlsx) ou CSV com três colunas, nesta ordem: código, nome do produto e saldo. A primeira linha pode ser o cabeçalho. Você pode bipar antes de importar, mas a planilha é necessária para finalizar e gerar o relatório.'],
  ['Como bipo várias peças seguidas?', 'Toque em Bipar com a câmera e vá apontando para as etiquetas: cada leitura entra na lista sozinha, sem tocar em nada. Peças iguais contam uma a uma — afaste a câmera da etiqueta antes de ler a próxima. Ao terminar, toque em Concluir e depois em Finalizar para cruzar com a planilha e gerar o relatório.'],
  ['Posso contar sem internet?', 'Sim. Abra a contagem com internet e, se o sinal cair, continue bipando: os itens ficam guardados no aparelho e são enviados quando a conexão voltar.'],
  ['O leitor de código de barras não abre a câmera.', 'O navegador precisa de permissão para usar a câmera. Toque no cadeado ao lado do endereço do site, libere a câmera e recarregue a página. Você também pode digitar o código.'],
  ['Como leio o relatório?', '“Certos” são as peças em que o contado bate com o sistema. “Faltas” são peças que o sistema diz ter e você não encontrou. “Sobras” são peças encontradas a mais. Você pode anotar o motivo de cada divergência e exportar em PDF ou Excel.'],
  ['Finalizei a contagem por engano.', 'Abra o relatório da contagem e use “Reabrir contagem” para continuar de onde parou.'],
  ['Como cancelo a assinatura?', 'Em Conta → Assinatura → Gerenciar pagamento. O acesso continua até o fim do período já pago.'],
]

export default function Help() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="page-title">Ajuda</h1>
        <p className="page-subtitle">Respostas rápidas para as dúvidas mais comuns.</p>
      </header>

      <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:hidden">
              {q}
              <span className="text-zinc-500 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{a}</p>
          </details>
        ))}
      </div>

      <section className="card">
        <h2 className="text-base font-semibold">Fale com a gente</h2>
        <p className="mt-1 text-sm text-zinc-500">Não achou o que precisava? Escreva e respondemos por e-mail.</p>
        <a className="btn btn-secondary mt-4" href={`mailto:${SUPPORT_EMAIL}?subject=Ajuda com o Audite`}>{SUPPORT_EMAIL}</a>
      </section>
    </div>
  )
}
