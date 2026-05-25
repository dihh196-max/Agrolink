import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { api } from '../lib/api.js'
import type { User, AuthTokens } from '@agrolink/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  loadSession: () => Promise<void>
}

interface RegisterData {
  email: string
  phone: string
  name: string
  username: string
  password: string
  role?: 'producer' | 'supplier' | 'technician' | 'cooperative'
  bio?: string
  acceptedTerms: true
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken')
      if (!token) return set({ isLoading: false })
      const { data } = await api.get('/users/me')
      set({ user: data, isAuthenticated: true, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  login: async (email, password) => {
    const { data } = await api.post<{ user: User } & AuthTokens>('/auth/login', {
      email,
      password,
    })
    await SecureStore.setItemAsync('accessToken', data.accessToken)
    await SecureStore.setItemAsync('refreshToken', data.refreshToken)
    set({ user: data.user, isAuthenticated: true })
  },

  register: async (registerData) => {
    const { data } = await api.post<{ user: User } & AuthTokens>('/auth/register', registerData)
    await SecureStore.setItemAsync('accessToken', data.accessToken)
    await SecureStore.setItemAsync('refreshToken', data.refreshToken)
    set({ user: data.user, isAuthenticated: true })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken')
    await SecureStore.deleteItemAsync('refreshToken')
    set({ user: null, isAuthenticated: false })
  },
}))
