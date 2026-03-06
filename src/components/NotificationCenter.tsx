import { useState, useEffect } from 'react'
import { Bell, X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import {
  getUnreadNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  type NotificationPreferences
} from '../lib/scheduleNotifications'
import { useAuth } from '../contexts/AuthContext'

interface Notification {
  id: string
  title: string
  message: string
  notification_type: string
  created_at: string
  read_at?: string | null
  schedule_items?: {
    id: string
    categories: {
      name: string
    }
  }
}

interface NotificationCenterProps {
  preferences: NotificationPreferences | null
}

export default function NotificationCenter({ preferences }: NotificationCenterProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Carregar notificações ao montar
  useEffect(() => {
    if (user) {
      loadNotifications()
      
      // Poll a cada 5 minutos
      const interval = setInterval(loadNotifications, 5 * 60 * 1000)
      
      // Escutar eventos de notificação em tempo real
      window.addEventListener('notification:received', handleNewNotification)
      
      return () => {
        clearInterval(interval)
        window.removeEventListener('notification:received', handleNewNotification)
      }
    }
  }, [user])

  const loadNotifications = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const [unread, count] = await Promise.all([
        getUnreadNotifications(user.id),
        getUnreadNotificationsCount(user.id)
      ])
      
      setNotifications(unread)
      setUnreadCount(count)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewNotification = (event: CustomEvent) => {
    const newNotification = event.detail
    
    // Adicionar à lista (será buscado do banco em breve)
    loadNotifications()
    
    // Tocar som ou vibrar (opcional)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
      
      // Atualizar UI
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
      
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter(n => !n.read_at)
          .map(n => markNotificationAsRead(n.id))
      )
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
      )
      
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'now':
      case '1_hour':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case '1_day':
        return <Info className="w-5 h-5 text-blue-500" />
      case '7_days':
        return <CheckCircle2 className="w-5 h-5 text-gray-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-400" />
    }
  }

  const formatTime = (date: string) => {
    const notificationDate = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - notificationDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'agora'
    if (diffMins < 60) return `${diffMins}m atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    if (diffDays < 7) return `${diffDays}d atrás`
    
    return notificationDate.toLocaleDateString('pt-BR')
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notificações"
      >
        <Bell className="w-6 h-6" />
        
        {/* Badge com contagem */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[20px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between rounded-t-lg">
            <h3 className="text-lg font-semibold text-gray-900">Notificações</h3>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Marcar tudo como lido
                </button>
              )}
              
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="px-4 py-8 text-center text-gray-500">
                <div className="animate-spin inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nenhuma notificação</p>
              </div>
            )}

            {!isLoading && notifications.length > 0 && (
              <ul className="divide-y divide-gray-200">
                {notifications.map(notification => (
                  <li
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read_at ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getIconForType(notification.notification_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-gray-400 mt-2">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      
                      {!notification.read_at && (
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-3 text-center">
              <a
                href="/notifications"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver todas as notificações
              </a>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
