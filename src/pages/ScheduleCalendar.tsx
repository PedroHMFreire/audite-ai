import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllScheduleItems, ScheduleItem, Category, getCategories } from '@/lib/db'
import { useToast } from '@/components/Toast'

interface ScheduleItemWithCategory extends ScheduleItem {
  category: Category
}

export default function ScheduleCalendar() {
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

  // Generate calendar days (42 days = 6 weeks x 7 days)
  function getCalendarDays(): Date[] {
    const startDate = getStartOfCalendar(currentDate)
    const days: Date[] = []
    
    for (let i = 0; i < 42; i++) {
      days.push(addDays(startDate, i))
    }
    
    return days
  }

  function getItemsForDate(date: Date): ScheduleItemWithCategory[] {
    return scheduleItems.filter(item => 
      isSameDay(new Date(item.scheduled_date), date)
    )
  }

  function goToPreviousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  function goToNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  const calendarDays = getCalendarDays()
  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-zinc-300 dark:bg-zinc-600 rounded animate-pulse"></div>
            <h1 className="text-2xl font-bold">Cronograma de Contagens</h1>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
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

      {/* Month Navigation */}
      <div className="flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <span className="text-lg">←</span>
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <h2 className="text-lg sm:text-xl font-semibold text-center capitalize">
            {formatMonthYear(currentDate)}
          </h2>
          
          <button
            onClick={goToToday}
            className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            Hoje
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <span className="text-lg">→</span>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Week Headers */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {weekDays.map((day) => (
            <div key={day} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const dayItems = getItemsForDate(date)
            const isCurrentMonthDay = isCurrentMonth(date)
            const isTodayDate = isToday(date)
            const isPast = date < new Date() && !isTodayDate

            return (
              <div
                key={date.toISOString()}
                className={`
                  min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border-r border-b border-zinc-200 dark:border-zinc-800 transition-colors
                  ${index % 7 === 6 ? 'border-r-0' : ''}
                  ${index >= 35 ? 'border-b-0' : ''}
                  ${isTodayDate 
                    ? 'bg-blue-50 dark:bg-blue-950/30' 
                    : isCurrentMonthDay
                    ? 'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    : 'bg-zinc-50 dark:bg-zinc-800/30'
                  }
                  ${isPast && isCurrentMonthDay ? 'opacity-60' : ''}
                `}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`
                    text-xs sm:text-sm font-medium
                    ${isTodayDate 
                      ? 'bg-blue-500 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs' 
                      : isCurrentMonthDay
                      ? 'text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-400 dark:text-zinc-600'
                    }
                  `}>
                    {date.getDate()}
                  </span>
                </div>

                {/* Schedule Items */}
                <div className="space-y-1">
                  {dayItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="text-[10px] sm:text-xs px-1 py-0.5 rounded truncate font-medium"
                      style={{
                        backgroundColor: item.category.color,
                        color: '#ffffff'
                      }}
                      title={`${item.category.name} - ${item.status === 'pending' ? 'Agendado' : 
                        item.status === 'completed' ? 'Concluído' : 
                        item.status === 'skipped' ? 'Pulado' : 'Reagendado'}`}
                    >
                      {item.category.name}
                    </div>
                  ))}
                  
                  {/* Indicator for more items */}
                  {dayItems.length > 3 && (
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 px-1">
                      +{dayItems.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {scheduleItems.filter(item => {
              const itemDate = new Date(item.scheduled_date)
              const currentMonth = currentDate.getMonth()
              const currentYear = currentDate.getFullYear()
              return itemDate.getMonth() === currentMonth && 
                     itemDate.getFullYear() === currentYear &&
                     item.status === 'pending'
            }).length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Contagens agendadas este mês</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {scheduleItems.filter(item => {
              const itemDate = new Date(item.scheduled_date)
              const currentMonth = currentDate.getMonth()
              const currentYear = currentDate.getFullYear()
              return itemDate.getMonth() === currentMonth && 
                     itemDate.getFullYear() === currentYear &&
                     item.status === 'completed'
            }).length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Contagens concluídas este mês</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">
            {categories.length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Categorias ativas</div>
        </div>
      </div>

      {/* Legend */}
      {categories.length > 0 && (
        <div className="card">
          <h3 className="font-medium mb-3">Legenda das Categorias</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {categories.map(category => (
              <div key={category.id} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm truncate">{category.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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