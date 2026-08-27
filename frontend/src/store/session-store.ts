import { create } from 'zustand'
import * as authApi from '../api/auth'
import { configureAuthTransport } from '../api/client'
import type { CurrentUserContext, LoginInput } from '../types/auth'

export type SessionStatus = 'idle' | 'restoring' | 'authenticated' | 'anonymous'

interface SessionState {
  accessToken: string | null
  currentUser: CurrentUserContext | null
  status: SessionStatus
  restore: () => Promise<void>
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
  clear: () => void
}

async function resolveUser(accessToken: string) {
  useSessionStore.setState({ accessToken })
  try {
    const currentUser = await authApi.getCurrentUser()
    if (!currentUser) throw new Error('Authenticated user is not available')
    useSessionStore.setState({
      accessToken,
      currentUser,
      status: 'authenticated',
    })
  } catch (error) {
    useSessionStore.setState({
      accessToken: null,
      currentUser: null,
      status: 'anonymous',
    })
    throw error
  }
}

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: null,
  currentUser: null,
  status: 'idle',
  restore: async () => {
    if (useSessionStore.getState().status !== 'idle') return
    set({ status: 'restoring' })
    try {
      const token = await authApi.refreshSession()
      await resolveUser(token.accessToken)
    } catch {
      set({ accessToken: null, currentUser: null, status: 'anonymous' })
    }
  },
  login: async (input) => {
    const token = await authApi.login(input)
    await resolveUser(token.accessToken)
  },
  logout: async () => {
    try {
      await authApi.logout()
    } finally {
      set({ accessToken: null, currentUser: null, status: 'anonymous' })
    }
  },
  clear: () =>
    set({ accessToken: null, currentUser: null, status: 'anonymous' }),
}))

configureAuthTransport({
  getAccessToken: () => useSessionStore.getState().accessToken,
  refreshAccessToken: async () => {
    try {
      const token = await authApi.refreshSession()
      useSessionStore.setState({ accessToken: token.accessToken })
      return token.accessToken
    } catch {
      useSessionStore.getState().clear()
      return null
    }
  },
  onAuthenticationFailure: () => useSessionStore.getState().clear(),
})
