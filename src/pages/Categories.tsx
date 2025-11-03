import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/Toast'
import ColorPicker from '@/components/ColorPicker'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category
} from '@/lib/db'

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#8B5A3C', // Brown
  '#6B7280'  // Gray
]

export default function Categories() {
  const { addToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: DEFAULT_COLORS[0]
  })

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getCategories()
      setCategories(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar categorias'
      addToast({
        type: 'error',
        message: 'Erro ao carregar categorias',
        description: message
      })
      console.error('Erro ao carregar categorias:', err)
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      color: DEFAULT_COLORS[0]
    })
    setEditingId(null)
    setShowForm(false)
  }, [])

  const startCreate = useCallback(() => {
    resetForm()
    setShowForm(true)
  }, [resetForm])

  const startEdit = useCallback((category: Category) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color
    })
    setEditingId(category.id)
    setShowForm(true)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      addToast({
        type: 'warning',
        message: 'Nome é obrigatório'
      })
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        // Update
        await updateCategory(editingId, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          priority: 3, // Valor padrão fixo
          color: formData.color
        })
        addToast({
          type: 'success',
          message: 'Categoria atualizada!',
          duration: 2000
        })
      } else {
        // Create
        await createCategory({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          priority: 3, // Valor padrão fixo
          color: formData.color,
          is_active: true
        })
        addToast({
          type: 'success',
          message: 'Categoria criada!',
          duration: 2000
        })
      }
      
      resetForm()
      await loadCategories()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar categoria'
      addToast({
        type: 'error',
        message: 'Erro ao salvar categoria',
        description: message
      })
      console.error('Erro ao salvar categoria:', err)
    } finally {
      setSaving(false)
    }
  }, [formData, editingId, addToast, resetForm, loadCategories])

  const handleDelete = useCallback(async (category: Category) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
      return
    }

    try {
      await deleteCategory(category.id)
      addToast({
        type: 'info',
        message: 'Categoria removida',
        duration: 2000
      })
      await loadCategories()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir categoria'
      addToast({
        type: 'error',
        message: 'Erro ao excluir categoria',
        description: message
      })
      console.error('Erro ao excluir categoria:', err)
    }
  }, [addToast, loadCategories])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Carregando categorias...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Categorias</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gerencie os setores da sua loja
          </p>
        </div>
        <button 
          className="btn"
          onClick={startCreate}
          disabled={saving}
        >
          + Nova Categoria
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                {editingId ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button 
                type="button" 
                onClick={resetForm}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Roupas Masculinas"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <textarea
                className="input"
                rows={2}
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional da categoria..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cor</label>
              <ColorPicker
                value={formData.color}
                onChange={color => setFormData(prev => ({ ...prev, color }))}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="submit" 
                className="btn" 
                disabled={saving}
              >
                {saving ? 'Salvando...' : (editingId ? 'Atualizar' : 'Criar')}
              </button>
              <button 
                type="button" 
                className="badge" 
                onClick={resetForm}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="card text-center py-8">
            <div className="text-zinc-500 dark:text-zinc-400 mb-4">
              📂 Nenhuma categoria encontrada
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Crie categorias para organizar os setores da sua loja
            </p>
            <button className="btn" onClick={startCreate}>
              Criar primeira categoria
            </button>
          </div>
        ) : (
          categories.map(category => (
            <div key={category.id} className="card">
              <div className="flex items-center gap-4">
                {/* Color indicator */}
                <div 
                  className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600"
                  style={{ backgroundColor: category.color }}
                />
                
                {/* Category info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{category.name}</h3>
                  </div>
                  {category.description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                      {category.description}
                    </p>
                  )}
                  {category.last_counted_at && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                      Última contagem: {new Date(category.last_counted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <button 
                    className="badge"
                    onClick={() => startEdit(category)}
                  >
                    Editar
                  </button>
                  <button 
                    className="badge text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(category)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      {categories.length > 0 && (
        <div className="card">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <strong>{categories.length}</strong> categoria{categories.length !== 1 ? 's' : ''} cadastrada{categories.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}