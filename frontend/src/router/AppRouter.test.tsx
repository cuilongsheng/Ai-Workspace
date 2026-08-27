import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CurrentUserContext } from '../types/auth'
import { useSessionStore } from '../store/session-store'
import { AppRouter } from './AppRouter'
import i18n from '../i18n/config'

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

describe('application router', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en-US')
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/')
    useSessionStore.setState({
      accessToken: null,
      currentUser: null,
      status: 'anonymous',
    })
  })

  it('redirects anonymous users away from protected routes', async () => {
    window.history.replaceState({}, '', '/workspace')
    render(<AppRouter />)

    expect(
      await screen.findByRole('heading', {
        name: 'Sign in to AI Workspace',
      }),
    ).toBeInTheDocument()
  })

  it('renders the protected shell for an authenticated user', async () => {
    useSessionStore.setState({
      accessToken: 'access',
      currentUser,
      status: 'authenticated',
    })
    window.history.replaceState({}, '', '/workspace')
    render(<AppRouter />)

    expect(
      await screen.findByRole('navigation', { name: 'Workspace' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Breadcrumb' }),
    ).toHaveTextContent('Departments')
  })

  it('does not render protected content while restoring', async () => {
    let finishRestore: (() => void) | undefined
    useSessionStore.setState({
      status: 'idle',
      restore: vi.fn(async () => {
        useSessionStore.setState({ status: 'restoring' })
        await new Promise<void>((resolve) => {
          finishRestore = resolve
        })
        useSessionStore.setState({ status: 'anonymous' })
      }),
    })
    window.history.replaceState({}, '', '/workspace')
    render(<AppRouter />)

    expect(screen.getByText('Restoring session…')).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Workspace' }),
    ).not.toBeInTheDocument()
    await waitFor(() => expect(finishRestore).toBeDefined())
    await act(async () => finishRestore?.())
    expect(
      await screen.findByRole('heading', {
        name: 'Sign in to AI Workspace',
      }),
    ).toBeInTheDocument()
  })

  it('shows a stable no-access page for an authenticated user without roles', async () => {
    useSessionStore.setState({
      accessToken: 'access',
      currentUser: {
        ...currentUser,
        role: null,
        organization: {
          ...currentUser.organization!,
          role: null,
          permissions: [],
        },
      },
      status: 'authenticated',
    })
    window.history.replaceState({}, '', '/workspace')
    render(<AppRouter />)

    expect(
      await screen.findByRole('heading', {
        name: 'No department or role has been assigned to this account',
      }),
    ).toBeInTheDocument()
  })

  it('renders an explicit unknown-route fallback', async () => {
    window.history.replaceState({}, '', '/missing')
    render(<AppRouter />)

    expect(
      await screen.findByRole('heading', { name: '404' }),
    ).toBeInTheDocument()
  })
})
