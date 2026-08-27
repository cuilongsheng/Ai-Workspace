import { apiClient } from './client'

export type PlatformOrganization = {
  id: string
  name: string
  status: 'ACTIVE' | 'DISABLED'
  createdAt: string
  updatedAt?: string
  administrator?: {
    id: string
    email: string
    username: string | null
  }
  users?: Array<{
    id: string
    email: string
    username: string | null
  }>
}
export type PlatformDashboard = {
  organizations: number
  activeOrganizations: number
  disabledOrganizations: number
  recentOrganizations: PlatformOrganization[]
}
export const listPlatformOrganizations = async () =>
  (await apiClient.get<PlatformOrganization[]>('/platform/organizations')).data
export const getPlatformOrganization = async (id: string) =>
  (await apiClient.get<PlatformOrganization>(`/platform/organizations/${id}`))
    .data
export const createPlatformOrganization = async (input: {
  name: string
  administratorEmail: string
  administratorName?: string
  administratorPassword: string
}) =>
  (
    await apiClient.post<PlatformOrganization>(
      '/platform/organizations',
      input,
      {
        successToast: true,
      },
    )
  ).data
export const updatePlatformOrganization = async (id: string, name: string) =>
  (
    await apiClient.patch<PlatformOrganization>(
      `/platform/organizations/${id}`,
      { name },
      { successToast: true },
    )
  ).data
export const createPlatformOrganizationAdministrator = async (
  id: string,
  input: { email: string; username?: string; password: string },
) =>
  (
    await apiClient.post<{
      id: string
      email: string
      username: string | null
    }>(`/platform/organizations/${id}/administrator`, input, {
      successToast: true,
    })
  ).data
export const disablePlatformOrganization = async (id: string) =>
  (
    await apiClient.patch<PlatformOrganization>(
      `/platform/organizations/${id}/disable`,
      undefined,
      { successToast: true },
    )
  ).data
export const enablePlatformOrganization = async (id: string) =>
  (
    await apiClient.patch<PlatformOrganization>(
      `/platform/organizations/${id}/enable`,
      undefined,
      { successToast: true },
    )
  ).data
export const getPlatformDashboard = async () =>
  (await apiClient.get<PlatformDashboard>('/platform/dashboard')).data
