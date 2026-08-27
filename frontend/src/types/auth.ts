export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED'
export type AccountRole =
  | 'PLATFORM_ADMIN'
  | 'ORGANIZATION_ADMIN'
  | 'DEPARTMENT_ADMIN'
  | 'DEPARTMENT_MEMBER'

export interface OrganizationSummary {
  id: string
  name: string
  nameEn?: string | null
  status: string
  role: 'ORGANIZATION_ADMIN' | null
  permissions: string[]
}

export interface DepartmentMembership {
  membershipId: string
  id: string
  name: string
  nameEn?: string | null
  roles: Array<{ id: string; name: string }>
  permissions: string[]
}

export interface CurrentUserContext {
  id: string
  email: string
  username: string
  status: UserStatus
  role: AccountRole | null
  platform: { role: 'PLATFORM_ADMIN'; permissions: string[] } | null
  organization: OrganizationSummary | null
  departments: DepartmentMembership[]
}

export interface AccessTokenResponse {
  accessToken: string
  expiresIn: number
  tokenType: 'Bearer'
}

export interface LoginResponse extends AccessTokenResponse {
  user: Pick<CurrentUserContext, 'id' | 'email' | 'username' | 'status'>
}

export interface LoginInput {
  account: string
  password: string
}
