import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import i18n from '../i18n/config'
import { toast } from '@heroui/react'

declare module 'axios' {
  interface AxiosRequestConfig {
    successToast?: boolean
  }
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _authRetry?: boolean
}

export class ApiError extends Error {
  readonly status?: number
  readonly code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type AuthTransport = {
  getAccessToken: () => string | null
  refreshAccessToken: () => Promise<string | null>
  onAuthenticationFailure: () => void
}

let authTransport: AuthTransport = {
  getAccessToken: () => null,
  refreshAccessToken: async () => null,
  onAuthenticationFailure: () => undefined,
}
let refreshPromise: Promise<string | null> | null = null

export function configureAuthTransport(transport: AuthTransport) {
  authTransport = transport
}

export const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ??
    `${window.location.protocol}//${window.location.hostname}:3000`,
  withCredentials: true,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.resolvedLanguage?.startsWith('en')
    ? 'en-US'
    : 'zh-CN'
  const token = authTransport.getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    if (response.config.successToast) {
      toast.success(i18n.t('api.success'), { timeout: 2500 })
    }
    return response
  },
  async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined
    const isAuthEndpoint =
      config?.url?.startsWith('/auth/login') ||
      config?.url?.startsWith('/auth/refresh')

    if (
      error.response?.status === 401 &&
      config &&
      !config._authRetry &&
      !isAuthEndpoint
    ) {
      config._authRetry = true
      refreshPromise ??= authTransport.refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const token = await refreshPromise
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        return apiClient.request(config)
      }
      authTransport.onAuthenticationFailure()
    }

    const normalized = normalizeApiError(error)
    if (!isAuthEndpoint) {
      toast.danger(i18n.t('api.error'), {
        description: normalized.message,
        timeout: 5000,
      })
    }
    return Promise.reject(normalized)
  },
)

export function normalizeApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error))
    return new ApiError(
      i18n.resolvedLanguage?.startsWith('en')
        ? 'An unexpected error occurred. Please try again.'
        : '发生未知错误，请稍后重试。',
    )
  const data = error.response?.data as
    { message?: string | string[]; code?: string } | undefined
  const message = Array.isArray(data?.message)
    ? data.message.join('；')
    : data?.message
  return new ApiError(
    message ??
      error.message ??
      (i18n.resolvedLanguage?.startsWith('en')
        ? 'Request failed. Please try again.'
        : '请求失败，请稍后重试。'),
    error.response?.status,
    data?.code,
  )
}
