import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getUserProfile, getTrialStatusMessage, isTrialActive, getTrialDaysRemaining, UserProfile } from '@/lib/trial'
import type { User } from '@supabase/supabase-js'

export default function TrialDebug() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // 1. Verificar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser()
      setAuthUser(user)
      
      if (user) {
        // 2. Buscar perfil do usuário
        const profile = await getUserProfile()
        setUserProfile(profile)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Carregando dados do trial...</div>
  }

  const trialStatus = getTrialStatusMessage(userProfile)

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">🧪 Debug do Sistema de Trial</h1>
        
        <div className="grid gap-6">
          {/* Status de Autenticação */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">👤 Usuário Autenticado</h2>
            {authUser ? (
              <div className="space-y-2">
                <p><strong>ID:</strong> {authUser.id}</p>
                <p><strong>Email:</strong> {authUser.email}</p>
                <p><strong>Email confirmado:</strong> {authUser.email_confirmed_at ? '✅ Sim' : '❌ Não'}</p>
                <p><strong>Criado em:</strong> {new Date(authUser.created_at).toLocaleString()}</p>
                <p><strong>Metadata:</strong></p>
                <pre className="bg-zinc-100 p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(authUser.user_metadata, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-red-600">❌ Usuário não autenticado</p>
            )}
          </div>

          {/* Perfil do Usuário */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">📋 Perfil do Usuário (user_profiles)</h2>
            {userProfile ? (
              <div className="space-y-2">
                <p><strong>ID:</strong> {userProfile.id}</p>
                <p><strong>Nome da Loja:</strong> {userProfile.store_name || 'N/A'}</p>
                <p><strong>Nome do Proprietário:</strong> {userProfile.owner_name || 'N/A'}</p>
                <p><strong>Plano:</strong> {userProfile.plan || 'N/A'}</p>
                <p><strong>Trial Ativo:</strong> {userProfile.trial_active ? '✅ Sim' : '❌ Não'}</p>
                <p><strong>Data Início Trial:</strong> {userProfile.trial_start ? new Date(userProfile.trial_start).toLocaleString() : 'N/A'}</p>
                <p><strong>Data Fim Trial:</strong> {userProfile.trial_end ? new Date(userProfile.trial_end).toLocaleString() : 'N/A'}</p>
                <p><strong>Status Assinatura:</strong> {userProfile.subscription_status || 'N/A'}</p>
                <p><strong>Criado em:</strong> {userProfile.created_at ? new Date(userProfile.created_at).toLocaleString() : 'N/A'}</p>
                
                <div className="mt-4">
                  <p><strong>Perfil Completo:</strong></p>
                  <pre className="bg-zinc-100 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(userProfile, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-red-600">❌ Perfil não encontrado na tabela user_profiles</p>
            )}
          </div>

          {/* Status do Trial */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">⏰ Status do Trial</h2>
            <div className="space-y-2">
              <p><strong>Trial Ativo:</strong> {isTrialActive(userProfile) ? '✅ Sim' : '❌ Não'}</p>
              <p><strong>Dias Restantes:</strong> {getTrialDaysRemaining(userProfile)}</p>
              <p><strong>Tipo do Status:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  trialStatus.type === 'active' ? 'bg-green-100 text-green-800' :
                  trialStatus.type === 'expired' ? 'bg-red-100 text-red-800' :
                  trialStatus.type === 'paid' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {trialStatus.type}
                </span>
              </p>
              <p><strong>Mensagem:</strong> {trialStatus.message}</p>
            </div>
          </div>

          {/* Cálculos Manuais */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">🔢 Cálculos Manuais</h2>
            {userProfile?.trial_end ? (
              <div className="space-y-2">
                <p><strong>Data Atual:</strong> {new Date().toISOString()}</p>
                <p><strong>Data Fim Trial:</strong> {userProfile.trial_end}</p>
                <p><strong>Diferença (ms):</strong> {new Date(userProfile.trial_end).getTime() - new Date().getTime()}</p>
                <p><strong>Diferença (dias):</strong> {Math.ceil((new Date(userProfile.trial_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}</p>
                <p><strong>Trial no futuro:</strong> {new Date() < new Date(userProfile.trial_end) ? '✅ Sim' : '❌ Não'}</p>
              </div>
            ) : (
              <p className="text-gray-600">Dados do trial não disponíveis</p>
            )}
          </div>

          {/* Ações */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">🔄 Ações</h2>
            <div className="space-x-4">
              <button 
                onClick={loadData}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Recarregar Dados
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}