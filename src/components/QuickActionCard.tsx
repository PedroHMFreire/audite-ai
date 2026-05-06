import { useEffect, useState } from 'react'
import { Plus, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { createCount } from '@/lib/db'
import { useNavigate } from 'react-router-dom'

type Props = {
  onStartCount?: (nome: string, loja?: string | null) => void
}

export default function QuickActionCard({ onStartCount }: Props) {
  const [nome, setNome] = useState('')
  const [loja, setLoja] = useState('')
  const [recentStores, setRecentStores] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    loadRecentStores()
  }, [])

  async function loadRecentStores() {
    const { data, error } = await supabase
      .from('counts')
      .select('loja')
      .not('loja', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!error && data) {
      const unique = Array.from(new Set(data.map(d => d.loja).filter(Boolean))) as string[]
      setRecentStores(unique)
    }
  }

  async function handleStartCount() {
    if (!nome.trim()) return alert('Defina um nome para a contagem')
    
    try {
      setLoading(true)
      const c = await createCount(nome.trim(), loja.trim() || null)
      onStartCount?.(nome, loja)
      setNome('')
      setLoja('')
      nav(`/contagens/${c.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="md:hidden card bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Iniciar Nova Contagem
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Comece uma contagem rápida
            </p>
          </div>
          <div className="p-2 bg-primary-200 dark:bg-primary-700/50 rounded-lg">
            <Plus className="h-5 w-5 text-primary-600 dark:text-primary-300" />
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            className="input w-full"
            placeholder="Nome da contagem"
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleStartCount()}
          />
          <input
            type="text"
            className="input w-full"
            placeholder="Loja (opcional)"
            value={loja}
            onChange={e => setLoja(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleStartCount()}
            list="recent-stores"
          />
          <datalist id="recent-stores">
            {recentStores.map(store => (
              <option key={store} value={store} />
            ))}
          </datalist>

          <button
            onClick={handleStartCount}
            disabled={loading}
            className="w-full btn btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {loading ? 'Iniciando...' : 'Iniciar Contagem'}
          </button>

          {recentStores.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                Lojas recentes
              </div>
              <div className="flex flex-wrap gap-2">
                {recentStores.slice(0, 3).map(store => (
                  <button
                    key={store}
                    onClick={() => setLoja(store)}
                    className="px-3 py-1 text-xs bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors flex items-center gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    {store}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex card bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-800 p-4 items-center gap-4">
        <div className="p-2 bg-primary-200 dark:bg-primary-700/50 rounded-lg h-fit">
          <Plus className="h-5 w-5 text-primary-600 dark:text-primary-300" />
        </div>

        <div className="flex-1 flex gap-3 items-center">
          <input
            type="text"
            className="input h-10 text-sm flex-1"
            placeholder="Nome da contagem"
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleStartCount()}
          />
          <input
            type="text"
            className="input h-10 text-sm w-40"
            placeholder="Loja"
            value={loja}
            onChange={e => setLoja(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleStartCount()}
            list="recent-stores-desktop"
          />
          <datalist id="recent-stores-desktop">
            {recentStores.map(store => (
              <option key={store} value={store} />
            ))}
          </datalist>

          <button
            onClick={handleStartCount}
            disabled={loading}
            className="btn btn-primary h-10 text-sm whitespace-nowrap flex items-center gap-2 px-6"
          >
            <Plus className="h-4 w-4" />
            {loading ? 'Iniciando...' : 'Iniciar'}
          </button>
        </div>

        {recentStores.length > 0 && (
          <div className="hidden lg:flex gap-2">
            {recentStores.slice(0, 2).map(store => (
              <button
                key={store}
                onClick={() => setLoja(store)}
                className="px-2 py-1 text-xs bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors whitespace-nowrap"
              >
                {store}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
