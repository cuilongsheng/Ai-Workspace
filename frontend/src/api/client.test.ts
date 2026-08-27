import {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  apiClient,
  ApiError,
  configureAuthTransport,
  normalizeApiError,
} from './client'

const originalAdapter = apiClient.defaults.adapter

function unauthorized(config: InternalAxiosRequestConfig) {
  const response: AxiosResponse = {
    data: { message: 'Unauthorized' },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  }
  return new AxiosError(
    'Unauthorized',
    AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    response,
  )
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  configureAuthTransport({
    getAccessToken: () => null,
    refreshAccessToken: async () => null,
    onAuthenticationFailure: () => undefined,
  })
})

describe('API client authentication recovery', () => {
  it('coordinates concurrent 401 responses through one refresh', async () => {
    const refreshAccessToken = vi.fn(async () => 'renewed-access')
    configureAuthTransport({
      getAccessToken: () => null,
      refreshAccessToken,
      onAuthenticationFailure: vi.fn(),
    })
    apiClient.defaults.adapter = async (config) => {
      if (config.headers.Authorization === 'Bearer renewed-access') {
        return {
          data: { ok: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }
      throw unauthorized(config)
    }

    const responses = await Promise.all([
      apiClient.get('/protected'),
      apiClient.get('/protected'),
    ])

    expect(responses.every(({ data }) => data.ok)).toBe(true)
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  })

  it('does not retry recursively when refresh cannot recover', async () => {
    const onAuthenticationFailure = vi.fn()
    configureAuthTransport({
      getAccessToken: () => null,
      refreshAccessToken: async () => null,
      onAuthenticationFailure,
    })
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw unauthorized(config)
    })
    apiClient.defaults.adapter = adapter

    await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(ApiError)
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(onAuthenticationFailure).toHaveBeenCalledTimes(1)
  })

  it('normalizes server validation messages', () => {
    const config = { headers: {} } as InternalAxiosRequestConfig
    const response = {
      data: { message: ['email must be valid', 'password is too short'] },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config,
    }
    const error = new AxiosError(
      'Bad Request',
      AxiosError.ERR_BAD_REQUEST,
      config,
      undefined,
      response,
    )

    expect(normalizeApiError(error)).toMatchObject({
      message: 'email must be valid；password is too short',
      status: 400,
    })
  })
})
