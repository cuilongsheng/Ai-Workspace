import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import { useSessionStore } from '../../store/session-store'
import i18n from '../../i18n/config'
import { Toast } from '@heroui/react'

function renderLogin() {
  return render(
    <BrowserRouter>
      <LoginPage />
      <Toast.Provider placement="top" />
    </BrowserRouter>,
  )
}

describe('login page', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en-US')
  })

  it('shows accessible client-side validation', async () => {
    useSessionStore.setState({
      status: 'anonymous',
      accessToken: null,
      currentUser: null,
    })
    renderLogin()

    await userEvent.clear(screen.getByLabelText('Username or email'))
    await userEvent.clear(screen.getByLabelText('Password'))
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(
      await screen.findByText('Enter your username or email'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Password must be at least 6 characters'),
    ).toBeInTheDocument()
  })

  it('renders the confirmed login error state after a failed submission', async () => {
    useSessionStore.setState({
      status: 'anonymous',
      login: async () => {
        throw new Error('Check your email and password, then try again.')
      },
    })
    renderLogin()

    await userEvent.clear(screen.getByLabelText('Username or email'))
    await userEvent.clear(screen.getByLabelText('Password'))
    await userEvent.type(
      screen.getByLabelText('Username or email'),
      'maya@acme.com',
    )
    await userEvent.type(screen.getByLabelText('Password'), 'not-the-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Unable to sign in')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute(
      'aria-invalid',
      'false',
    )
  })

  it('toggles password visibility', async () => {
    useSessionStore.setState({
      status: 'anonymous',
      accessToken: null,
      currentUser: null,
    })
    renderLogin()

    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
  })
})
