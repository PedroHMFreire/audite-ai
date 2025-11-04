import { supabase } from './supabaseClient'

export interface UserProfile {
  id: string
  store_name?: string
  owner_name?: string
  phone?: string
  segment?: string
  plan?: string
  trial_start?: string
  trial_end?: string
  trial_active?: boolean
  subscription_status?: string
  created_at?: string
  updated_at?: string
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return null
  }
}

export async function createUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        ...profileData
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in createUserProfile:', error)
    return null
  }
}

export function isTrialActive(profile: UserProfile | null): boolean {
  if (!profile) return false
  
  if (!profile.trial_active || !profile.trial_end) return false
  
  const trialEnd = new Date(profile.trial_end)
  const now = new Date()
  
  return now < trialEnd
}

export function getTrialDaysRemaining(profile: UserProfile | null): number {
  if (!profile || !profile.trial_end) return 0
  
  const trialEnd = new Date(profile.trial_end)
  const now = new Date()
  const diffTime = trialEnd.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

export async function updateTrialStatus(subscriptionStatus: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: subscriptionStatus,
        trial_active: subscriptionStatus === 'trial',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating trial status:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateTrialStatus:', error)
    return false
  }
}

export function getTrialStatusMessage(profile: UserProfile | null): { 
  type: 'active' | 'expired' | 'paid' | 'none'
  message: string 
  daysRemaining?: number 
} {
  if (!profile) {
    return { type: 'none', message: 'Perfil não encontrado' }
  }

  if (profile.subscription_status === 'active') {
    return { type: 'paid', message: 'Plano ativo' }
  }

  if (profile.subscription_status === 'trial') {
    const daysRemaining = getTrialDaysRemaining(profile)
    if (daysRemaining > 0) {
      return { 
        type: 'active', 
        message: `Teste gratuito - ${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`,
        daysRemaining 
      }
    } else {
      return { type: 'expired', message: 'Teste gratuito expirado' }
    }
  }

  return { type: 'none', message: 'Status desconhecido' }
}