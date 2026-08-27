import type { DepartmentMembership } from '../../types/auth'

const CHAT_ROLE_NAMES = new Set(['DEPARTMENT_ADMIN', 'DEPARTMENT_MEMBER'])

export function getChatDepartments(departments: DepartmentMembership[]) {
  return departments.filter((department) =>
    department.roles.some((role) => CHAT_ROLE_NAMES.has(role.name)),
  )
}

export function resolveChatDepartment(
  departments: DepartmentMembership[],
  savedDepartmentId: string | null,
) {
  const chatDepartments = getChatDepartments(departments)
  return (
    chatDepartments.find((department) => department.id === savedDepartmentId) ??
    chatDepartments[0]
  )
}
