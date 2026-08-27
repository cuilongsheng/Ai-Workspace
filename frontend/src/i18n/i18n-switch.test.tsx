import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'

import { apiClient } from '../api/client'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import i18n from './config'

const originalAdapter = apiClient.defaults.adapter

afterEach(async () => {
  apiClient.defaults.adapter = originalAdapter
  await i18n.changeLanguage('zh-CN')
})

describe('Chinese and English language contract', () => {
  it('persists the UI switch and sends the selected locale to the backend', async () => {
    await i18n.changeLanguage('zh-CN')
    render(<LanguageSwitcher />)

    await userEvent.click(screen.getByRole('button', { name: '切换语言' }))
    await userEvent.click(screen.getByRole('radio', { name: 'English' }))
    await userEvent.click(screen.getByRole('button', { name: '确认' }))

    expect(i18n.resolvedLanguage).toBe('en-US')
    expect(localStorage.getItem('ai-workspace-language')).toBe('en-US')
    expect(
      screen.getByRole('button', { name: 'Switch language' }),
    ).toHaveTextContent('English')

    let requestConfig: InternalAxiosRequestConfig | undefined
    apiClient.defaults.adapter = async (config) => {
      requestConfig = config
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }
    await apiClient.get('/language-contract')

    expect(requestConfig?.headers['Accept-Language']).toBe('en-US')
  })
})
