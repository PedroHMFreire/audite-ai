import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Item = { name: string; Regular: number; Excesso: number; Falta: number }
export default function Charts({ data }: { data: Item[] }) {
  return (
    <div className="card mt-4">
      <div className="text-sm mb-2">Resumo por Contagem</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="Regular" stackId="a" />
            <Bar dataKey="Excesso" stackId="a" />
            <Bar dataKey="Falta" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
