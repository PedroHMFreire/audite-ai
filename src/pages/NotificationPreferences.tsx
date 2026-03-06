import { useState, useEffect } from 'react'
import { Bell, Clock, Mail, Smartphone, Save, AlertCircle } from 'lucide-react'
import {
  getUserNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences
} from '../lib/scheduleNotifications'
import { useAuth } from '../contexts/AuthContext'

export default function NotificationPreferences() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Carregar preferências ao montar
  useEffect(() => {
    if (user) {
      loadPreferences()
    }
  }, [user])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      const prefs = await getUserNotificationPreferences(user!.id)
      if (prefs) {
        setPreferences(prefs)
      }
      setError(null)
    } catch (err) {
      setError('Erro ao carregar preferências de notificação')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!preferences || !user) return

    try {
      setIsSaving(true)
      setError(null)
      
      const updated = await updateNotificationPreferences(user.id, preferences)
      
      if (updated) {
        setPreferences(updated)
        setSaveSuccess(true)
        
        // Esconder mensagem de sucesso após 3s
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (err) {
      setError('Erro ao salvar preferências')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (preferences) {
      setPreferences({
        ...preferences,
        [key]: !preferences[key]
      })
    }
  }

  const handleInputChange = (key: keyof NotificationPreferences, value: any) => {
    if (preferences) {
      setPreferences({
        ...preferences,
        [key]: value
      })
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full"></div>
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">Erro ao carregar preferências de notificação</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Preferências de Notificação</h1>
        </div>
        <p className="text-gray-600">Personalize como deseja receber notificações sobre suas auditorias agendadas</p>
      </div>

      {/* Messages */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">✓ Preferências salvas com sucesso!</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Main Settings */}
      <div className="space-y-8">
        {/* Master Toggle */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Notificações Habilitadas</h2>
              <p className="text-sm text-gray-600 mt-1">Ativar/desativar todas as notificações</p>
            </div>
            
            <button
              onClick={() => handleToggle('notifications_enabled')}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                preferences.notifications_enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  preferences.notifications_enabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Notification Channels */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Canais de Notificação</h2>
          
          <div className="space-y-4">
            {/* In-App */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Notificações No App</p>
                  <p className="text-sm text-gray-600">Alertas dentro do AUDITE.AI</p>
                </div>
              </div>
              
              <button
                onClick={() => handleToggle('in_app_enabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.in_app_enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    preferences.in_app_enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Push */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-gray-900">Notificações Push</p>
                  <p className="text-sm text-gray-600">Alertas do navegador/dispositivo</p>
                </div>
              </div>
              
              <button
                onClick={() => handleToggle('push_enabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.push_enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    preferences.push_enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Notificações por Email</p>
                  <p className="text-sm text-gray-600">Enviar resumos por email</p>
                </div>
              </div>
              
              <button
                onClick={() => handleToggle('email_enabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.email_enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    preferences.email_enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Notification Timing */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quando Notificar</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">7 dias antes</label>
              <input
                type="checkbox"
                checked={preferences.notify_7_days_before}
                onChange={() => handleToggle('notify_7_days_before')}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">1 dia antes</label>
              <input
                type="checkbox"
                checked={preferences.notify_1_day_before}
                onChange={() => handleToggle('notify_1_day_before')}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">1 hora antes</label>
              <input
                type="checkbox"
                checked={preferences.notify_1_hour_before}
                onChange={() => handleToggle('notify_1_hour_before')}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">No momento da auditoria</label>
              <input
                type="checkbox"
                checked={preferences.notify_at_time}
                onChange={() => handleToggle('notify_at_time')}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Horários Silenciosos</h2>
            </div>
            
            <button
              onClick={() => handleToggle('quiet_hours_enabled')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.quiet_hours_enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  preferences.quiet_hours_enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Não enviar notificações entre determinados horários
          </p>

          {preferences.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Início
                </label>
                <input
                  type="time"
                  value={preferences.quiet_hours_start || '22:00'}
                  onChange={(e) => handleInputChange('quiet_hours_start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fim
                </label>
                <input
                  type="time"
                  value={preferences.quiet_hours_end || '08:00'}
                  onChange={(e) => handleInputChange('quiet_hours_end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Timezone */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fuso Horário
          </label>
          
          <select
            value={preferences.timezone}
            onChange={(e) => handleInputChange('timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
            <option value="America/Brasilia">Brasília (GMT-3)</option>
            <option value="America/Fortaleza">Fortaleza (GMT-3)</option>
            <option value="America/Manaus">Manaus (GMT-4)</option>
            <option value="America/Anchorage">UTC-5</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Salvando...' : 'Salvar Preferências'}
        </button>

        <button
          onClick={loadPreferences}
          disabled={isSaving}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
