import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CurrentUserContext } from '../types/auth'

const authApi = vi.hoisted(() => ({
  refreshSession: vi.fn(),
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('../api/auth', () => authApi)

import { useSessionStore } from './session-store'

const currentUser: CurrentUserContext = {
  id: 'user-1',
  email: 'member@example.com',
  username: 'Member',
  status: 'ACTIVE',
  role: 'ORGANIZATION_ADMIN',
  platform: null,
  organization: {
    id: 'org-1',
    name: 'Example',
    status: 'ACTIVE',
    role: 'ORGANIZATION_ADMIN',
    permissions: [],
  },
  departments: [],
}

describe('session store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSessionStore.setState({
      accessToken: null,
      currentUser: null,
      status: 'idle',
    })
  })

  it('restores a session through refresh and current user', async () => {
    authApi.refreshSession.mockResolvedValue({
      accessToken: 'access',
      expiresIn: 300,
      tokenType: 'Bearer',
    })
    authApi.getCurrentUser.mockResolvedValue(currentUser)

    await useSessionStore.getState().restore()

    expect(useSessionStore.getState()).toMatchObject({
      accessToken: 'access',
      currentUser,
      status: 'authenticated',
    })
  })

  it('becomes anonymous when restoration fails', async () => {
    authApi.refreshSession.mockRejectedValue(new Error('missing cookie'))

    await useSessionStore.getState().restore()

    expect(useSessionStore.getState()).toMatchObject({
      accessToken: null,
      currentUser: null,
      status: 'anonymous',
    })
  })

  it('does not authenticate when current-user context is unavailable', async () => {
    authApi.refreshSession.mockResolvedValue({
      accessToken: 'access',
      expiresIn: 300,
      tokenType: 'Bearer',
    })
    authApi.getCurrentUser.mockResolvedValue(null)

    await useSessionStore.getState().restore()

    expect(useSessionStore.getState()).toMatchObject({
      accessToken: null,
      currentUser: null,
      status: 'anonymous',
    })
  })

  it('always clears local session state on logout', async () => {
    useSessionStore.setState({
      accessToken: 'access',
      currentUser,
      status: 'authenticated',
    })
    authApi.logout.mockRejectedValue(new Error('offline'))

    await expect(useSessionStore.getState().logout()).rejects.toThrow('offline')
    expect(useSessionStore.getState()).toMatchObject({
      accessToken: null,
      currentUser: null,
      status: 'anonymous',
    })
  })
})
