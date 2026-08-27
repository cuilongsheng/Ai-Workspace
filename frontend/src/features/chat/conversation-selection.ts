import type { Conversation } from '../../api/chat'

export function resolveConversationForSubmission(
  conversations: Conversation[],
  activeConversationId: string | null,
  knowledgeBaseId: string,
) {
  return conversations.find(
    (conversation) =>
      conversation.id === activeConversationId &&
      conversation.knowledgeBaseId === knowledgeBaseId,
  )
}

export function resolveConversationFromRoute(
  conversations: Conversation[],
  conversationId?: string,
) {
  if (!conversationId) return null
  return (
    conversations.find((conversation) => conversation.id === conversationId) ??
    conversations[0] ??
    null
  )
}
