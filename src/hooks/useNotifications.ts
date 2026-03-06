/**
 * useNotifications Hook
 * Hook customizado para gerenciar notificações de auditoria
 */

import { useEffect, useState, useCallback } from 'react'
import {
  getUnreadNotifications,
  getUnreadNotificationsCount,
  getUserNotificationPreferences,
  markNotificationAsRead,
  type NotificationPreferences
} from '../lib/scheduleNotifications'

interface Notification {
  id: string
  title: string
  message: string
  notification_type: string
  created_at: string
  read_at?: string | null
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  preferences: NotificationPreferences | null
  isLoading: boolean
  error: string | null
  markAsRead: (notificationId: string) => Promise<void>
  refreshNotifications: () => Promise<void>
}

export function useNotifications(userId: string | undefined): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshNotifications = useCallback(async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      setError(null)

      const [unread, count, prefs] = await Promise.all([
        getUnreadNotifications(userId),
        getUnreadNotificationsCount(userId),
        getUserNotificationPreferences(userId)
      ])

      setNotifications(unread)
      setUnreadCount(count)
      setPreferences(prefs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notificações')
      console.error('Error fetching notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markNotificationAsRead(notificationId)

        // Atualizar UI otimisticamente
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
          )
        )

        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (err) {
        console.error('Error marking notification as read:', err)
      }
    },
    []
  )

  // Carregar notificações ao montar e quando userId muda
  useEffect(() => {
    refreshNotifications()

    // Poll a cada 5 minutos
    const interval = setInterval(refreshNotifications, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [userId, refreshNotifications])

  // Escutar eventos de notificação em tempo real
  useEffect(() => {
    const handleNewNotification = () => {
      // Recarregar quando nova notificação chega
      refreshNotifications()
    }

    window.addEventListener('notification:received', handleNewNotification)

    return () => {
      window.removeEventListener('notification:received', handleNewNotification)
    }
  }, [refreshNotifications])

  return {
    notifications,
    unreadCount,
    preferences,
    isLoading,
    error,
    markAsRead,
    refreshNotifications
  }
}
