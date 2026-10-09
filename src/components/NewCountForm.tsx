import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { createCount } from '@/lib/db'
import { accessErrorMessage } from './AccessGate'
import { useToast } from './Toast'

export function defaultCountName() {
  return `Balanço de ${new Date().toLocaleDateString('pt-BR', { month: 'long' })}`
}

/** Cria uma contagem e leva direto para a tela de bipar. */
export default function NewCountForm({ autoFocus = false, hint = true }: { autoFocus?: boolean; hint?: boolean }) {
  const nav = useNavigate()
  const { addToast } = useToast()
  const [nome, setNome] = useState('')
  const [creating, setCreating] = useState(false)

  async function start(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const c = await createCount(nome.trim() || defaultCountName(), null)
      nav(`/contagens/${c.id}`)
    } catch (err) {
      const blocked = accessErrorMessage(err)
      addToast({
        type: 'error',
        message: blocked || 'Não foi possível criar a contagem',
        description: blocked ? undefined : err instanceof Error ? err.message : undefined,
      })
      setCreating(false)
    }
  }

  return (
    <form onSubmit={start} className="card">
      <label htmlFor="nova-contagem" className="label">Nova contagem</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="nova-contagem"
          className="input flex-1"
          placeholder={defaultCountName()}
          maxLength={100}
          autoFocus={autoFocus}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <button type="submit" className="btn" disabled={creating}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {creating ? 'Criando…' : 'Começar'}
        </button>
      </div>
      {hint && (
        <p className="mt-2 text-xs text-zinc-500">
          Dê um nome ou deixe em branco. Depois você importa a planilha do estoque e começa a bipar.
        </p>
      )}
    </form>
  )
}
