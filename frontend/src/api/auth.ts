import type {
  AccessTokenResponse,
  CurrentUserContext,
  LoginInput,
  LoginResponse,
} from '../types/auth'
import { apiClient } from './client'

export async function login(input: LoginInput) {
  return (await apiClient.post<LoginResponse>('/auth/login', input)).data
}

export async function refreshSession() {
  return (await apiClient.post<AccessTokenResponse>('/auth/refresh')).data
}

export async function getCurrentUser() {
  return (await apiClient.get<CurrentUserContext | null>('/auth/me')).data
}

export async function logout() {
  await apiClient.post('/auth/logout')
}
