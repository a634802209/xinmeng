import { create } from 'zustand'

interface AdminUser {
  id: number
  username: string
  role: string
}

interface AdminAuthState {
  adminToken: string | null
  adminUser: AdminUser | null
  isAdminLoggedIn: boolean
  setAdminToken: (token: string | null) => void
  setAdminUser: (user: AdminUser | null) => void
  adminLogout: () => void
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  adminToken: localStorage.getItem('admin_token'),
  adminUser: (() => {
    try {
      const stored = localStorage.getItem('admin_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })(),
  isAdminLoggedIn: !!localStorage.getItem('admin_token'),

  setAdminToken: (token) => {
    if (token) {
      localStorage.setItem('admin_token', token)
    } else {
      localStorage.removeItem('admin_token')
    }
    set({ adminToken: token, isAdminLoggedIn: !!token })
  },

  setAdminUser: (user) => {
    if (user) {
      localStorage.setItem('admin_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('admin_user')
    }
    set({ adminUser: user })
  },

  adminLogout: () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    set({ adminToken: null, adminUser: null, isAdminLoggedIn: false })
  },
}))
