import { useEffect, useState } from 'react'
import { ChevronDown, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

type Props = {
  onFilterChange?: (period: string, store?: string) => void
}

export default function HomeHeader({ onFilterChange }: Props) {
  const [greeting, setGreeting] = useState('')
  const [countThisWeek, setCountThisWeek] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [stores, setStores] = useState<string[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [showPeriodMenu, setShowPeriodMenu] = useState(false)
  const [showStoreMenu, setShowStoreMenu] = useState(false)

  useEffect(() => {
    // Cumprimento baseado na hora
    const hourNow = new Date().getHours()
    if (hourNow < 12) setGreeting('Bom dia')
    else if (hourNow < 18) setGreeting('Boa tarde')
    else setGreeting('Boa noite')

    // Carregar contagens desta semana e último update
    loadWeekStats()
    loadStores()
  }, [])

  async function loadWeekStats() {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { data, error } = await supabase
      .from('counts')
      .select('id, updated_at')
      .gte('created_at', weekAgo.toISOString())

    if (!error && data) {
      setCountThisWeek(data.length)
      if (data.length > 0) {
        const last = new Date(data[0].updated_at)
        const now = new Date()
        const diffMs = now.getTime() - last.getTime()
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 1) setLastUpdate('agora mesmo')
        else if (diffMins < 60) setLastUpdate(`há ${diffMins}min`)
        else {
          const diffHours = Math.floor(diffMins / 60)
          setLastUpdate(`há ${diffHours}h`)
        }
      }
    }
  }

  async function loadStores() {
    const { data, error } = await supabase
      .from('counts')
      .select('loja')
      .not('loja', 'is', null)

    if (!error && data) {
      const unique = Array.from(new Set(data.map(d => d.loja).filter(Boolean))) as string[]
      setStores(unique)
    }
  }

  function handleFilterChange() {
    onFilterChange?.(selectedPeriod, selectedStore || undefined)
  }

  return (
    <div className="mb-8 space-y-4">
      {/* Header com cumprimento */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold dark:text-white">
            {greeting} 👋
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Você tem {countThisWeek} contagens esta semana
          </p>
        </div>
        {lastUpdate && (
          <div className="text-right">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Última atualização</div>
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {lastUpdate}
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        {/* Período */}
        <div className="relative">
          <button
            onClick={() => {
              setShowPeriodMenu(!showPeriodMenu)
              setShowStoreMenu(false)
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {selectedPeriod === 'week' && 'Esta semana'}
            {selectedPeriod === 'month' && 'Este mês'}
            {selectedPeriod === 'all' && 'Todas'}
            <ChevronDown className="h-4 w-4" />
          </button>
          {showPeriodMenu && (
            <div className="absolute top-full mt-1 left-0 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg shadow-lg z-10">
              {[
                { value: 'week', label: 'Esta semana' },
                { value: 'month', label: 'Este mês' },
                { value: 'all', label: 'Todas' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSelectedPeriod(opt.value)
                    setShowPeriodMenu(false)
                    handleFilterChange()
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                    selectedPeriod === opt.value
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loja */}
        {stores.length > 0 && (
          <div className="relative">
            <button
              onClick={() => {
                setShowStoreMenu(!showStoreMenu)
                setShowPeriodMenu(false)
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {selectedStore ? `Loja: ${selectedStore}` : 'Todas as lojas'}
              <ChevronDown className="h-4 w-4" />
            </button>
            {showStoreMenu && (
              <div className="absolute top-full mt-1 left-0 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedStore('')
                    setShowStoreMenu(false)
                    handleFilterChange()
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                    !selectedStore
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-600'
                  }`}
                >
                  Todas as lojas
                </button>
                {stores.map(store => (
                  <button
                    key={store}
                    onClick={() => {
                      setSelectedStore(store)
                      setShowStoreMenu(false)
                      handleFilterChange()
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                      selectedStore === store
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-600'
                    }`}
                  >
                    {store}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={() => {
            loadWeekStats()
            loadStores()
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Atualizar
        </button>
      </div>
    </div>
  )
}
