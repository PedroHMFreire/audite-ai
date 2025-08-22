type Props = {
  totals: { regular: number; excesso: number; falta: number }
}
export default function DashboardCards({ totals }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="card">
        <div className="text-xs text-zinc-500">Regulares</div>
        <div className="text-2xl font-semibold">{totals.regular}</div>
      </div>
      <div className="card">
        <div className="text-xs text-zinc-500">Em Excesso</div>
        <div className="text-2xl font-semibold">{totals.excesso}</div>
      </div>
      <div className="card">
        <div className="text-xs text-zinc-500">Em Falta</div>
        <div className="text-2xl font-semibold">{totals.falta}</div>
      </div>
    </div>
  )
}
