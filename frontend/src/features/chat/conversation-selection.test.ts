import { describe, expect, it } from 'vitest'
import type { Conversation } from '../../api/chat'
import {
  resolveConversationFromRoute,
  resolveConversationForSubmission,
} from './conversation-selection'

const conversation = (
  id: string,
  knowledgeBaseId: string,
  messages: Conversation['messages'] = [],
): Conversation => ({
  id,
  knowledgeBaseId,
  messages,
  title: null,
  organizationId: 'org-1',
  departmentId: 'department-1',
  updatedAt: '2026-08-24T00:00:00.000Z',
})

describe('knowledge base conversation selection', () => {
  it('never reuses another conversation when the selected knowledge base changes', () => {
    const existing = [
      conversation('current', 'kb-1', [
        { role: 'USER', content: 'hello', createdAt: '2026-08-24' },
      ]),
      conversation('other-history', 'kb-2'),
    ]

    expect(
      resolveConversationForSubmission(existing, 'current', 'kb-2'),
    ).toBeUndefined()
    expect(
      resolveConversationForSubmission(existing, 'current', 'kb-1')?.id,
    ).toBe('current')
  })

  it('opens a blank draft on the base chat route without creating or selecting history', () => {
    const existing = [
      conversation('other', 'kb-2'),
      conversation('existing', 'kb-1'),
    ]

    expect(resolveConversationFromRoute(existing)).toBeNull()
    expect(resolveConversationFromRoute(existing, 'existing')?.id).toBe(
      'existing',
    )
    expect(resolveConversationFromRoute(existing, 'missing')?.id).toBe('other')
  })
})
