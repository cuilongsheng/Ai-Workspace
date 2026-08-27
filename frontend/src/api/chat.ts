import { apiClient } from './client'
import i18n from '../i18n/config'

export type Conversation = {
  id: string
  title: string | null
  organizationId: string
  departmentId: string
  knowledgeBaseId: string
  updatedAt: string
  messages?: Array<{
    role: 'USER' | 'ASSISTANT'
    content: string
    createdAt: string
  }>
  clientStatus?: 'creating' | 'failed'
}
export type Citation = {
  id?: string
  sourceNumber: number
  documentName?: string
  quote?: string
  /** 兼容旧前端快照；V1 稳定合同字段为 quote。 */
  content?: string
  page?: number | null
  documentId?: string
  documentChunkId?: string
}
export type ChatMessage = {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
  citations?: Citation[]
  retrievalStatus?: RetrievalStatus | null
  suggestions?: string[]
  helpful?: boolean | null
}
export type RetrievalStatus =
  | 'not_ready'
  | 'no_match'
  | 'retrieval_unavailable'
  | 'needs_clarification'
  | 'partial'
  | 'grounded'
export type ChatStreamEvent = {
  type: 'start' | 'delta' | 'citations' | 'retrieval' | 'done' | 'error'
  status?: RetrievalStatus
  message?: string
  suggestions?: string[]
  content?: string
  citations?: Citation[]
}

export async function saveMessageFeedback(
  messageId: string,
  helpful: boolean,
  reason?: string,
) {
  return (
    await apiClient.post(`/conversations/messages/${messageId}/feedback`, {
      helpful,
      reason,
    })
  ).data
}

export async function listConversations(departmentId: string) {
  return (
    await apiClient.get<Conversation[]>('/conversations', {
      params: { departmentId },
    })
  ).data
}
export async function getMessages(conversationId: string) {
  return (
    await apiClient.get<ChatMessage[]>(
      `/conversations/${conversationId}/messages`,
    )
  ).data
}
export async function createConversation(
  input: Pick<
    Conversation,
    'organizationId' | 'departmentId' | 'knowledgeBaseId'
  > & { title?: string },
) {
  return (await apiClient.post<Conversation>('/conversations', input)).data
}

export async function deleteConversation(conversationId: string) {
  await apiClient.delete(`/conversations/${conversationId}`, {
    successToast: true,
  })
}

export async function streamMessage(
  conversationId: string,
  content: string,
  accessToken: string | null,
  onEvent: (event: ChatStreamEvent) => void,
) {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL ?? `${window.location.protocol}//${window.location.hostname}:3000`}/conversations/${conversationId}/messages/stream`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': i18n.resolvedLanguage?.startsWith('en')
          ? 'en-US'
          : 'zh-CN',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ content }),
    },
  )
  if (!response.ok || !response.body)
    throw new Error(`Unable to send message (${response.status}).`)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const item of events) {
      const payload = item
        .split('\n')
        .find((line) => line.startsWith('data: '))
        ?.slice(6)
      if (payload) onEvent(JSON.parse(payload) as ChatStreamEvent)
    }
  }
}
