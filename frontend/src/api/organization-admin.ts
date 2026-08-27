import { apiClient } from './client'

export type Department = {
  id: string
  name: string
  nameEn?: string | null
  createdAt: string
  _count: { memberships: number }
}
export type OrganizationRole = { id: string; name: string }
export type Member = {
  id: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  user: { id: string; email: string; username: string | null; status: string }
  department: { id: string; name: string; nameEn?: string | null }
  roles: Array<{ role: OrganizationRole }>
}
export type Employee = {
  id: string
  email: string
  username: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED'
  organizationRole: 'ORGANIZATION_ADMIN' | null
  createdAt: string
  memberships?: Array<{
    id: string
    status: string
    department: { id: string; name: string; nameEn?: string | null }
    roles: Array<{ role: OrganizationRole }>
  }>
}

export const listDepartments = async () =>
  (await apiClient.get<Department[]>('/organization-admin/departments')).data
export const createDepartment = async (name: string, nameEn?: string) =>
  (
    await apiClient.post<Department>(
      '/organization-admin/departments',
      {
        name,
        nameEn,
      },
      { successToast: true },
    )
  ).data
export const updateDepartment = async (
  id: string,
  name: string,
  nameEn?: string,
) =>
  (
    await apiClient.patch<Department>(
      `/organization-admin/departments/${id}`,
      {
        name,
        nameEn,
      },
      { successToast: true },
    )
  ).data

export const listEmployees = async (search?: string) =>
  (
    await apiClient.get<Employee[]>('/organization-admin/employees', {
      params: search ? { search } : undefined,
    })
  ).data
export const createEmployee = async (input: {
  email: string
  username?: string
  password: string
  organizationAdmin?: boolean
  departmentId?: string
  roleIds?: string[]
}) =>
  (
    await apiClient.post<Employee>('/organization-admin/employees', input, {
      successToast: true,
    })
  ).data
export const updateEmployee = async (
  employeeId: string,
  input: {
    username?: string
    status?: Employee['status']
    organizationAdmin?: boolean
  },
) =>
  (
    await apiClient.patch<Employee>(
      `/organization-admin/employees/${employeeId}`,
      input,
      { successToast: true },
    )
  ).data
export const removeEmployee = async (employeeId: string) =>
  apiClient.delete(`/organization-admin/employees/${employeeId}`, {
    successToast: true,
  })

export const listRoles = async () =>
  (await apiClient.get<OrganizationRole[]>('/organization-admin/roles')).data
export const listMembers = async (departmentId: string) =>
  (
    await apiClient.get<Member[]>(
      `/organization-admin/departments/${departmentId}/members`,
    )
  ).data
export async function assignMember(
  departmentId: string,
  input: { employeeId: string; roleIds: string[] },
): Promise<Member> {
  return (
    await apiClient.post<Member>(
      `/organization-admin/departments/${departmentId}/members`,
      input,
      { successToast: true },
    )
  ).data
}

export const listEmployeeOptions = async (departmentId: string, search = '') =>
  (
    await apiClient.get<Employee[]>(
      `/organization-admin/departments/${departmentId}/employee-options`,
      { params: search ? { search } : undefined },
    )
  ).data

export const updateMember = async (
  departmentId: string,
  membershipId: string,
  input: { employeeId: string; roleIds: string[] },
) =>
  (
    await apiClient.patch<Member>(
      `/organization-admin/departments/${departmentId}/members/${membershipId}`,
      input,
      { successToast: true },
    )
  ).data
export const removeMember = async (
  departmentId: string,
  membershipId: string,
) =>
  apiClient.delete(
    `/organization-admin/departments/${departmentId}/members/${membershipId}`,
    { successToast: true },
  )
