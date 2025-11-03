import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getScheduleItems, getAllScheduleItems, ScheduleItem, Category, getCategories } from '@/lib/db'
import { useToast } from '@/components/Toast'

interface ScheduleItemWithCategory extends ScheduleItem {
  category: Category
}

export default function ScheduleCalendar() {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItemWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  // Helper functions for date manipulation (simplified without date-fns)
  function getStartOfWeek(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
    return new Date(d.setDate(diff))
  }

  function addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  function formatShortDate(date: Date): string {
    return date.toLocaleDateString('pt-BR')
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString()
  }

  function isToday(date: Date): boolean {
    return isSameDay(date, new Date())
  }

  const [currentWeek, setCurrentWeek] = useState(new Date())
  const weekStart = getStartOfWeek(currentWeek)

  useEffect(() => {
    loadData()
  }, [])

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

  function getWeekDays() {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i))
    }
    return days
  }

  function getItemsForDate(date: Date) {
    return scheduleItems.filter(item => 
      isSameDay(new Date(item.scheduled_date), date)
    )
  }

  function goToPreviousWeek() {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeek(newDate)
  }

  function goToNextWeek() {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeek(newDate)
  }

  function goToToday() {
    setCurrentWeek(new Date())
  }

  const weekDays = getWeekDays()
  const weekEnd = addDays(weekStart, 6)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-zinc-300 dark:bg-zinc-600 rounded animate-pulse"></div>
            <h1 className="text-2xl font-bold">Cronograma de Contagens</h1>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
            <span className="text-white text-xs">📅</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">Cronograma de Contagens</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/cronograma"
            className="btn-secondary text-sm gap-1.5"
          >
            <span className="text-xs">⚙️</span>
            Configurar
          </Link>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <button
          onClick={goToPreviousWeek}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <span className="text-lg">←</span>
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <h2 className="text-sm sm:text-lg font-semibold text-center">
            {formatShortDate(weekStart)} - {formatShortDate(weekEnd)}
          </h2>
          
          <button
            onClick={goToToday}
            className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            Hoje
          </button>
        </div>

        <button
          onClick={goToNextWeek}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <span className="text-lg">→</span>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-7">
        {weekDays.map((date, index) => {
          const dayItems = getItemsForDate(date)
          const isWeekend = index === 5 || index === 6 // Saturday or Sunday
          const isPast = date < new Date() && !isToday(date)

          return (
            <div
              key={date.toISOString()}
              className={`
                min-h-[120px] sm:min-h-[200px] p-2 sm:p-3 rounded-lg border transition-colors
                ${isToday(date) 
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' 
                  : isWeekend
                  ? 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                }
                ${isPast ? 'opacity-60' : ''}
              `}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div>
                  <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 capitalize">
                    {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </div>
                  <div className={`text-base sm:text-lg font-semibold ${
                    isToday(date) ? 'text-blue-600 dark:text-blue-400' : ''
                  }`}>
                    {date.getDate()}
                  </div>
                </div>
              </div>

              {/* Schedule Items */}
              <div className="space-y-1 sm:space-y-2">
                {dayItems.length === 0 ? (
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-2 sm:py-4">
                    Nenhuma contagem
                  </div>
                ) : (
                  dayItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-1.5 sm:p-2 rounded-md text-xs border"
                      style={{
                        backgroundColor: `${item.category.color}15`,
                        borderColor: `${item.category.color}40`,
                        color: item.category.color
                      }}
                    >
                      <div className="font-medium truncate" title={item.category.name}>
                        {item.category.name}
                      </div>
                      {item.notes && (
                        <div className="text-zinc-600 dark:text-zinc-400 mt-1 truncate" title={item.notes}>
                          {item.notes}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-zinc-500 dark:text-zinc-400">
                        <span className="text-xs">🕒</span>
                        <span>Status: {
                          item.status === 'pending' ? 'Agendado' : 
                          item.status === 'completed' ? 'Concluído' : 
                          item.status === 'skipped' ? 'Pulado' : 'Reagendado'
                        }</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {scheduleItems.filter(item => {
              const itemDate = new Date(item.scheduled_date)
              return itemDate >= weekStart && 
                     itemDate <= weekEnd &&
                     item.status === 'pending'
            }).length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Contagens agendadas nesta semana</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {scheduleItems.filter(item => {
              const itemDate = new Date(item.scheduled_date)
              return itemDate >= weekStart && 
                     itemDate <= weekEnd &&
                     item.status === 'completed'
            }).length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Contagens concluídas nesta semana</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">
            {categories.length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Categorias ativas</div>
        </div>
      </div>

      {/* No Schedule Notice */}
      {scheduleItems.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600 mb-4 flex items-center justify-center text-4xl">
            📅
          </div>
          <h3 className="text-xl font-semibold mb-2">Nenhum cronograma encontrado</h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Configure um cronograma para começar a agendar contagens automáticas.
          </p>
          <Link to="/cronograma" className="btn-primary gap-2">
            <span className="text-sm">➕</span>
            Configurar Cronograma
          </Link>
        </div>
      )}
    </div>
  )
}