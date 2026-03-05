import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AlertTriangle } from 'lucide-react'

type Item = { name: string; Regular: number; Excesso: number; Falta: number }

export default function Charts({ data }: { data: Item[] }) {
  const [isDark, setIsDark] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'regular' | 'excesso' | 'falta'>('all')

  useEffect(() => {
    // Detectar dark mode inicial
    const darkModeEnabled = document.documentElement.classList.contains('dark')
    setIsDark(darkModeEnabled)

    // Listen para mudanças de tema
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark')
      setIsDark(dark)
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  // Cores dinâmicas baseadas no tema
  const colors = {
    gridStroke: isDark ? '#27272a' : '#e4e4e7',
    tooltipBg: isDark ? '#18181b' : '#ffffff',
    tooltipBorder: isDark ? '#3f3f46' : '#e4e4e7',
    tooltipText: isDark ? '#fafafa' : '#18181b',
    axisLabel: isDark ? '#a1a1aa' : '#71717a',
    barRegular: isDark ? '#a1a1aa' : '#71717a',
    barExcesso: isDark ? '#71717a' : '#a1a1aa',
    barFalta: isDark ? '#52525b' : '#d4d4d8'
  }

  // Detectar maior desvio para destaque
  const maxFalta = Math.max(...data.map(d => d.Falta), 0)
  const maxExcesso = Math.max(...data.map(d => d.Excesso), 0)
  const hasHighFalta = maxFalta > 0
  const hasHighExcesso = maxExcesso > 0

  return (
    <div className="card mt-6 space-y-4">
      {/* Header com título e filtros */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">Resumo de Contagens</div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Análise dos próximos {data.length} registros</p>
        </div>

        {/* Botões de filtro */}
        <div className="flex gap-2 flex-wrap justify-end">
          {[
            { value: 'all', label: 'Todas' },
            { value: 'regular', label: 'Regular' },
            { value: 'excesso', label: 'Excesso' },
            { value: 'falta', label: 'Falta' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value as any)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                filterType === opt.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerta de desvios críticos */}
      {(hasHighFalta || hasHighExcesso) && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">
            {hasHighFalta && <div>⚠️ Alto nível de faltas detectado - revisar abastecimento</div>}
            {hasHighExcesso && <div>⚠️ Quantidade em excesso em algumas categorias</div>}
          </div>
        </div>
      )}

      {/* Gráfico */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={colors.gridStroke} 
            />
            <XAxis 
              dataKey="name"
              stroke={colors.axisLabel}
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              allowDecimals={false}
              stroke={colors.axisLabel}
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              labelStyle={{ color: colors.tooltipText }}
              itemStyle={{ color: colors.tooltipText }}
            />
            {(filterType === 'all' || filterType === 'regular') && (
              <Bar dataKey="Regular" stackId="a" fill={colors.barRegular} />
            )}
            {(filterType === 'all' || filterType === 'excesso') && (
              <Bar dataKey="Excesso" stackId="a" fill={colors.barExcesso} />
            )}
            {(filterType === 'all' || filterType === 'falta') && (
              <Bar dataKey="Falta" stackId="a" fill={colors.barFalta} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}