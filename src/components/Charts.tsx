import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Item = { name: string; Regular: number; Excesso: number; Falta: number }
export default function Charts({ data }: { data: Item[] }) {
  return (
    <div className="card mt-4">
      <div className="text-sm mb-2">Resumo por Contagem</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              labelStyle={{ color: '#18181b' }}
            />
            <Bar dataKey="Regular" stackId="a" fill="#71717a" />
            <Bar dataKey="Excesso" stackId="a" fill="#a1a1aa" />
            <Bar dataKey="Falta" stackId="a" fill="#d4d4d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
