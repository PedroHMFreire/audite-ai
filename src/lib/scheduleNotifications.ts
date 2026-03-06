/**
 * Schedule Notifications Service
 * Gerencia detecção, processamento e envio de notificações de auditorias
 */

import { supabase } from './supabaseClient'
import { differenceInHours, differenceInDays, format } from 'date-fns'

export interface ScheduleNotification {
  scheduleItemId: string
  categoryName: string
  scheduledDate: Date
  userId: string
  type: '7_days' | '1_day' | '1_hour' | 'now'
}

export interface NotificationPreferences {
  id: string
  user_id: string
  in_app_enabled: boolean
  push_enabled: boolean
  email_enabled: boolean
  notify_7_days_before: boolean
  notify_1_day_before: boolean
  notify_1_hour_before: boolean
  notify_at_time: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  timezone: string
  notifications_enabled: boolean
}

// Tipos de mensagens
const NOTIFICATION_MESSAGES = {
  '7_days': {
    title: '📋 Auditoria Agendada',
    message: (category: string, date: string) => 
      `Auditoria de ${category} agendada para ${date}. Prepare-se!`
  },
  '1_day': {
    title: '📌 Auditoria Amanhã',
    message: (category: string, date: string) => 
      `Auditoria de ${category} agendada para amanhã às ${date}`
  },
  '1_hour': {
    title: '⏰ Auditoria em 1 Hora!',
    message: (category: string) => 
      `ATENÇÃO: Auditoria de ${category} começará em 1 hora!`,
    urgent: true
  },
  'now': {
    title: '🚀 Auditoria Iniciando!',
    message: (category: string) => 
      `Auditoria de ${category} está iniciando AGORA!`,
    urgent: true
  }
} as const

/**
 * Verificar quais auditorias precisam de notificação
 */
export async function checkScheduledAuditsForNotification() {
  try {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Buscar schedule_items pendentes nos próximos 7 dias
    const { data: scheduledItems, error } = await supabase
      .from('schedule_items')
      .select(`
        id,
        scheduled_date,
        categories!inner (
          id,
          name
        ),
        schedule_configs!inner (
          user_id
        )
      `)
      .eq('status', 'pending')
      .gte('scheduled_date', now.toISOString().split('T')[0])
      .lte('scheduled_date', sevenDaysFromNow.toISOString().split('T')[0])

    if (error) {
      console.error('Error checking audits:', error)
      throw error
    }

    const notifications: ScheduleNotification[] = []

    for (const item of scheduledItems || []) {
      const scheduledDate = new Date(item.scheduled_date)
      const hoursUntil = differenceInHours(scheduledDate, now)
      const daysUntil = differenceInDays(scheduledDate, now)

      // Determinar tipo de notificação baseado no tempo
      if (daysUntil === 7 && now.getHours() === 9) {
        // Notificar 7 dias antes às 9h
        notifications.push({
          scheduleItemId: item.id,
          categoryName: item.categories.name,
          scheduledDate,
          userId: item.schedule_configs.user_id,
          type: '7_days'
        })
      } else if (daysUntil === 1 && now.getHours() === 9) {
        // Notificar 1 dia antes às 9h
        notifications.push({
          scheduleItemId: item.id,
          categoryName: item.categories.name,
          scheduledDate,
          userId: item.schedule_configs.user_id,
          type: '1_day'
        })
      } else if (hoursUntil === 1 && now.getMinutes() < 5) {
        // Notificar 1 hora antes
        notifications.push({
          scheduleItemId: item.id,
          categoryName: item.categories.name,
          scheduledDate,
          userId: item.schedule_configs.user_id,
          type: '1_hour'
        })
      } else if (hoursUntil === 0 && now.getMinutes() < 5) {
        // Notificar no momento (primeiros 5 minutos)
        notifications.push({
          scheduleItemId: item.id,
          categoryName: item.categories.name,
          scheduledDate,
          userId: item.schedule_configs.user_id,
          type: 'now'
        })
      }
    }

    return notifications
  } catch (error) {
    console.error('Error in checkScheduledAuditsForNotification:', error)
    return []
  }
}

/**
 * Obter preferências do usuário
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  try {
    // Tenta obter preferências existentes
    let { data: preferences, error } = await supabase
      .from('notifications_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Não existe, criar com padrões
      const { data: newPrefs, error: insertError } = await supabase
        .from('notifications_preferences')
        .insert({
          user_id: userId
        })
        .select()
        .single()

      if (insertError) throw insertError
      preferences = newPrefs
    } else if (error) {
      throw error
    }

    return preferences
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return null
  }
}

/**
 * Verificar se notificação deve ser enviada baseado em preferências
 */
export function shouldSendNotification(
  preferences: NotificationPreferences,
  notificationType: '7_days' | '1_day' | '1_hour' | 'now'
): boolean {
  // Verificar se notificações estão globalmente habilitadas
  if (!preferences.notifications_enabled) return false

  // Verificar se este tipo de notificação está habilitado
  const typeMap = {
    '7_days': preferences.notify_7_days_before,
    '1_day': preferences.notify_1_day_before,
    '1_hour': preferences.notify_1_hour_before,
    'now': preferences.notify_at_time
  }

  if (!typeMap[notificationType]) return false

  // Verificar quiet hours
  if (preferences.quiet_hours_enabled && preferences.quiet_hours_start && preferences.quiet_hours_end) {
    const now = new Date()
    const currentTime = format(now, 'HH:mm:ss')
    
    if (currentTime >= preferences.quiet_hours_start && currentTime <= preferences.quiet_hours_end) {
      return false
    }
  }

  return true
}

/**
 * Enviar notificação através de múltiplos canais
 */
export async function sendNotification(
  notification: ScheduleNotification,
  preferences: NotificationPreferences
): Promise<void> {
  try {
    // Verificar se deve enviar
    if (!shouldSendNotification(preferences, notification.type)) {
      console.log('Notification blocked by user preferences')
      return
    }

    const messageConfig = NOTIFICATION_MESSAGES[notification.type]
    const scheduledTime = format(notification.scheduledDate, 'HH:mm')
    const scheduledDateFormatted = format(notification.scheduledDate, 'dd/MM/yyyy')

    const title = messageConfig.title
    const message = messageConfig.message(
      notification.categoryName,
      notification.type === '7_days' ? scheduledDateFormatted : scheduledTime
    )

    // 1. Notificação In-App (via Toast)
    if (preferences.in_app_enabled) {
      await sendInAppNotification({
        title,
        message,
        type: notification.type,
        scheduleItemId: notification.scheduleItemId
      })
    }

    // 2. Push Notification (Service Worker)
    if (preferences.push_enabled && 'serviceWorker' in navigator) {
      await sendPushNotification({
        title,
        message,
        scheduleItemId: notification.scheduleItemId,
        type: notification.type
      })
    }

    // 3. Email (será processado por backend)
    if (preferences.email_enabled) {
      await sendEmailNotification({
        userId: notification.userId,
        title,
        message,
        scheduleItemId: notification.scheduleItemId
      })
    }

    // 4. Log na database
    await logNotification({
      userId: notification.userId,
      scheduleItemId: notification.scheduleItemId,
      notificationType: notification.type,
      channels: [
        preferences.in_app_enabled ? 'in_app' : null,
        preferences.push_enabled ? 'push' : null,
        preferences.email_enabled ? 'email' : null
      ].filter(Boolean) as string[],
      title,
      message
    })
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}

/**
 * Enviar notificação In-App
 */
async function sendInAppNotification(data: {
  title: string
  message: string
  type: string
  scheduleItemId: string
}) {
  try {
    // Dispatch custom event para componente Toast ouvir
    window.dispatchEvent(
      new CustomEvent('notification:received', {
        detail: {
          ...data,
          channel: 'in_app',
          timestamp: new Date()
        }
      })
    )
  } catch (error) {
    console.error('Error sending in-app notification:', error)
  }
}

/**
 * Enviar Push Notification via Service Worker
 */
async function sendPushNotification(data: {
  title: string
  message: string
  scheduleItemId: string
  type: string
}) {
  try {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      // Verificar se tem permissão
      if (Notification.permission !== 'granted') {
        console.log('Push notification permission not granted')
        return
      }

      const registration = await navigator.serviceWorker.ready
      
      await registration.showNotification(data.title, {
        body: data.message,
        icon: '/icon-192.png',
        badge: '/icon-96.png',
        tag: `audit-${data.scheduleItemId}`,
        requireInteraction: data.type === 'now' || data.type === '1_hour', // Urgentes ficam visíveis
        data: {
          scheduleItemId: data.scheduleItemId,
          type: data.type,
          timestamp: new Date().toISOString()
        },
        actions: [
          {
            action: 'open-audit',
            title: 'Abrir Auditoria',
            icon: '/icon-96.png'
          },
          {
            action: 'dismiss',
            title: 'Descartar',
            icon: '/icon-96.png'
          }
        ]
      })
    }
  } catch (error) {
    console.error('Error sending push notification:', error)
  }
}

/**
 * Enviar notificação por Email (backend)
 */
async function sendEmailNotification(data: {
  userId: string
  title: string
  message: string
  scheduleItemId: string
}) {
  try {
    // Chamar Supabase Function para enviar email
    const { error } = await supabase.functions.invoke('send-notification-email', {
      body: data
    })

    if (error) throw error
  } catch (error) {
    console.error('Error sending email notification:', error)
  }
}

/**
 * Log de notificação na database
 */
export async function logNotification(data: {
  userId: string
  scheduleItemId: string
  notificationType: string
  channels: string[]
  title: string
  message: string
}): Promise<void> {
  try {
    for (const channel of data.channels) {
      const { error } = await supabase.from('notifications_log').insert({
        user_id: data.userId,
        schedule_item_id: data.scheduleItemId,
        notification_type: data.notificationType,
        channel,
        title: data.title,
        message: data.message,
        status: 'sent'
      })

      if (error) {
        console.error(`Error logging notification for channel ${channel}:`, error)
      }
    }
  } catch (error) {
    console.error('Error in logNotification:', error)
  }
}

/**
 * Marcar notificação como lida
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications_log')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) throw error
  } catch (error) {
    console.error('Error marking notification as read:', error)
  }
}

/**
 * Obter notificações não lidas do usuário
 */
export async function getUnreadNotifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications_log')
      .select(`
        id,
        title,
        message,
        notification_type,
        created_at,
        schedule_items!inner (
          id,
          categories (name)
        )
      `)
      .eq('user_id', userId)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching unread notifications:', error)
    return []
  }
}

/**
 * Obter contagem de notificações não lidas
 */
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }
}

/**
 * Atualizar preferências do usuário
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('notifications_preferences')
      .update(preferences)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return null
  }
}
