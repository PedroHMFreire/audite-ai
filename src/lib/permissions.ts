import { supabase } from './supabaseClient'

export interface UserRole {
  id: string
  user_id: string
  role: 'admin' | 'user' | 'moderator'
  permissions: string[]
  created_at: string
  updated_at: string
}

export const PERMISSIONS = {
  VIEW_ADMIN_DASHBOARD: 'view_admin_dashboard',
  VIEW_USER_ANALYTICS: 'view_user_analytics',
  MANAGE_USERS: 'manage_users',
  EXPORT_DATA: 'export_data',
  VIEW_FINANCIAL_DATA: 'view_financial_data',
  MANAGE_SYSTEM: 'manage_system'
} as const

export const ROLE_PERMISSIONS = {
  admin: [
    PERMISSIONS.VIEW_ADMIN_DASHBOARD,
    PERMISSIONS.VIEW_USER_ANALYTICS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_FINANCIAL_DATA,
    PERMISSIONS.MANAGE_SYSTEM
  ],
  moderator: [
    PERMISSIONS.VIEW_ADMIN_DASHBOARD,
    PERMISSIONS.VIEW_USER_ANALYTICS,
    PERMISSIONS.EXPORT_DATA
  ],
  user: []
}

class PermissionManager {
  private static instance: PermissionManager
  private userRole: UserRole | null = null

  private constructor() {}

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager()
    }
    return PermissionManager.instance
  }

  async getCurrentUserRole(): Promise<UserRole | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      this.userRole = roleData
      return roleData
    } catch (error) {
      console.error('Erro ao buscar role do usuário:', error)
      return null
    }
  }

  async hasPermission(permission: string): Promise<boolean> {
    const role = await this.getCurrentUserRole()
    if (!role) return false

    return role.permissions.includes(permission)
  }

  async isAdmin(): Promise<boolean> {
    const role = await this.getCurrentUserRole()
    return role?.role === 'admin'
  }

  async canViewAdminDashboard(): Promise<boolean> {
    return await this.hasPermission(PERMISSIONS.VIEW_ADMIN_DASHBOARD)
  }

  async assignRole(userId: string, role: 'admin' | 'user' | 'moderator'): Promise<boolean> {
    try {
      const isCurrentUserAdmin = await this.isAdmin()
      if (!isCurrentUserAdmin) {
        throw new Error('Apenas administradores podem atribuir roles')
      }

      const permissions = ROLE_PERMISSIONS[role]

      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role,
          permissions,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Erro ao atribuir role:', error)
      return false
    }
  }

  async getAllUsersWithRoles(): Promise<Array<{
    id: string
    email: string
    role: string
    permissions: string[]
    created_at: string
  }>> {
    try {
      const canManage = await this.hasPermission(PERMISSIONS.MANAGE_USERS)
      if (!canManage) {
        throw new Error('Sem permissão para ver usuários')
      }

      // Busca usuários do auth
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      if (!authUsers) return []

      // Busca roles dos usuários
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('*')

      const usersWithRoles = authUsers.users.map(user => {
        const role = userRoles?.find(r => r.user_id === user.id)
        return {
          id: user.id,
          email: user.email || '',
          role: role?.role || 'user',
          permissions: role?.permissions || [],
          created_at: user.created_at
        }
      })

      return usersWithRoles
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
      return []
    }
  }
}

export const permissionManager = PermissionManager.getInstance()

// Hook React para usar permissões
import { useState, useEffect } from 'react'

export function useUserPermissions() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserRole()
  }, [])

  async function loadUserRole() {
    try {
      const userRole = await permissionManager.getCurrentUserRole()
      setRole(userRole)
    } catch (error) {
      console.error('Erro ao carregar permissões:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = async (permission: string) => {
    return await permissionManager.hasPermission(permission)
  }

  const isAdmin = () => role?.role === 'admin'
  const isModerator = () => role?.role === 'moderator'
  const canViewAdminDashboard = () => role?.permissions.includes(PERMISSIONS.VIEW_ADMIN_DASHBOARD)

  return {
    role,
    loading,
    hasPermission,
    isAdmin,
    isModerator,
    canViewAdminDashboard,
    refreshRole: loadUserRole
  }
}