import { useEffect, useState } from 'react'
import { getAllScheduleItems, ScheduleItem, Category, getCategories } from '@/lib/db'
import { useToast } from '@/components/Toast'

interface ScheduleItemWithCategory extends ScheduleItem {
  category: Category
}

interface ScheduleCalendarProps {
  refreshTrigger?: number // Para forçar refresh quando cronograma é regenerado
}

export default function ScheduleCalendar({ refreshTrigger }: ScheduleCalendarProps) {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItemWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  // Estado para navegação mensal
  const [currentDate, setCurrentDate] = useState(new Date())

  // Helper functions for calendar manipulation
  function getStartOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  function getEndOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0)
  }

  function getStartOfCalendar(date: Date): Date {
    const startOfMonth = getStartOfMonth(date)
    const dayOfWeek = startOfMonth.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = 0
    return new Date(startOfMonth.getTime() - daysToSubtract * 24 * 60 * 60 * 1000)
  }

  function addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  function formatMonthYear(date: Date): string {
    return date.toLocaleDateString('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    })
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString()
  }

  function isToday(date: Date): boolean {
    return isSameDay(date, new Date())
  }

  function isCurrentMonth(date: Date): boolean {
    return date.getMonth() === currentDate.getMonth() && 
           date.getFullYear() === currentDate.getFullYear()
  }

  useEffect(() => {
    loadData()
  }, [refreshTrigger]) // Recarrega quando refreshTrigger muda

  async function loadData() {
    try {
      setLoading(true)
      const [itemsData, categoriesData] = await Promise.all([
        getAllScheduleItems(),
        getCategories()
      ])

      setCategories(categoriesData)
      
      // Join schedule items with categories
      const itemsWithCategories = itemsData.map((item: ScheduleItem) => ({
        ...item,
        category: categoriesData.find((cat: Category) => cat.id === item.category_id) || {
          id: item.category_id,
          user_id: '',
          name: 'Categoria não encontrada',
          description: '',
          color: '#666666',
          priority: 0,
          is_active: true,
          created_at: '',
          updated_at: ''
        }
      }))

      setScheduleItems(itemsWithCategories)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      addToast({
        message: 'Erro ao carregar cronograma',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Generate calendar days (42 days = 6 weeks)
  const calendarStart = getStartOfCalendar(currentDate)
  const calendarDays = Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i))

  // Get schedule items for each day
  const getItemsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return scheduleItems.filter(item => item.scheduled_date === dateStr)
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Carregando calendário...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">📅 Calendário de Contagens</h3>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Mês anterior"
          >
            ←
          </button>
          
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            Hoje
          </button>
          
          <h2 className="text-lg font-semibold min-w-48 text-center capitalize">
            {formatMonthYear(currentDate)}
          </h2>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Próximo mês"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
        {/* Header with weekdays */}
        <div className="grid grid-cols-7 bg-zinc-50 dark:bg-zinc-800">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-700 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const dayItems = getItemsForDay(date)
            const isCurrentMonthDay = isCurrentMonth(date)
            const isTodayDay = isToday(date)
            
            return (
              <div
                key={index}
                className={`min-h-24 p-2 border-r border-b border-zinc-200 dark:border-zinc-700 last:border-r-0 ${
                  isCurrentMonthDay 
                    ? 'bg-white dark:bg-zinc-900' 
                    : 'bg-zinc-50 dark:bg-zinc-800'
                } ${
                  isTodayDay ? 'bg-blue-50 dark:bg-blue-950/30' : ''
                }`}
              >
                {/* Day number */}
                <div className={`text-sm mb-1 ${
                  isCurrentMonthDay 
                    ? isTodayDay 
                      ? 'font-bold text-blue-600 dark:text-blue-400'
                      : 'text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-400 dark:text-zinc-600'
                }`}>
                  {date.getDate()}
                </div>

                {/* Schedule items */}
                <div className="space-y-1">
                  {dayItems.map(item => (
                    <div
                      key={item.id}
                      className={`text-xs px-2 py-1 rounded text-white truncate cursor-pointer transition-opacity ${
                        item.status === 'completed' ? 'opacity-60' : 'opacity-100'
                      }`}
                      style={{ backgroundColor: item.category.color }}
                      title={`${item.category.name} - ${item.status === 'completed' ? 'Concluído' : 'Pendente'}`}
                    >
                      {item.category.name}
                      {item.status === 'completed' && ' ✓'}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      {categories.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Legenda:</div>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <div key={category.id} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span>{category.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {scheduleItems.length === 0 && (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          <div className="text-lg mb-2">📅</div>
          <div>Nenhum item programado encontrado</div>
          <div className="text-sm mt-1">Crie configurações de cronograma para ver as contagens programadas</div>
        </div>
      )}
    </div>
  )
}