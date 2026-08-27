import { describe, expect, it } from 'vitest'
import type { DepartmentMembership } from '../../types/auth'
import { getChatDepartments, resolveChatDepartment } from './chat-context'

const departments = [
  {
    id: 'knowledge-filter-department',
    roles: [{ id: 'member-role', name: 'DEPARTMENT_MEMBER' }],
  },
  {
    id: 'last-chat-department',
    roles: [{ id: 'member-role', name: 'DEPARTMENT_MEMBER' }],
  },
  {
    id: 'admin-chat-department',
    roles: [{ id: 'admin-role', name: 'DEPARTMENT_ADMIN' }],
  },
] as DepartmentMembership[]

describe('chat department context', () => {
  it('uses the saved Chat department independently of a knowledge page filter', () => {
    expect(resolveChatDepartment(departments, 'last-chat-department')?.id).toBe(
      'last-chat-department',
    )
  })

  it('returns every department whose knowledge bases can be selected in Chat', () => {
    expect(getChatDepartments(departments).map((item) => item.id)).toEqual([
      'knowledge-filter-department',
      'last-chat-department',
      'admin-chat-department',
    ])
  })

  it('allows a department administrator to use Chat without a duplicate member role', () => {
    expect(
      resolveChatDepartment(departments, 'admin-chat-department')?.id,
    ).toBe('admin-chat-department')
  })
})
