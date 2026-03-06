/**
 * Type definitions for Notification System
 */

export interface Notification {
  id: string
  title: string
  message: string
  notification_type: '7_days' | '1_day' | '1_hour' | 'now'
  created_at: string
  read_at?: string | null
  user_id?: string
  schedule_item_id?: string
  channel?: 'in_app' | 'push' | 'email'
  status?: 'pending' | 'sent' | 'failed' | 'bounced'
  schedule_items?: ScheduleItemWithCategory[]
}

export interface ScheduleItemWithCategory {
  id: string
  categories?: {
    name: string
  } | {
    name: string
  }[]
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
  created_at?: string
  updated_at?: string
}

export interface ScheduleNotificationEvent {
  scheduleItemId: string
  categoryName: string
  scheduledDate: Date
  userId: string
  type: '7_days' | '1_day' | '1_hour' | 'now'
}

export interface PushNotificationData {
  title: string
  message: string
  scheduleItemId: string
  type: '7_days' | '1_day' | '1_hour' | 'now'
}

export interface EmailNotificationData {
  userId: string
  title: string
  message: string
  scheduleItemId: string
}

export interface NotificationLogEntry {
  userId: string
  scheduleItemId: string
  notificationType: string
  channels: string[]
  title: string
  message: string
}
