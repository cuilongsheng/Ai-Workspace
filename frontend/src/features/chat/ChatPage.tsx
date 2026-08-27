import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Folder,
  MessageSquare,
  Paperclip,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import {
  Fragment,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createConversation,
  deleteConversation,
  getMessages,
  listConversations,
  streamMessage,
  type ChatMessage,
  type Citation,
  type Conversation,
} from '../../api/chat'
import {
  getKnowledgeBaseReadiness,
  getKnowledgeBaseStarterQuestions,
  listKnowledgeBases,
  type KnowledgeBase,
  type KnowledgeBaseReadiness,
} from '../../api/knowledge-bases'
import { useSessionStore } from '../../store/session-store'
import { useTranslation } from 'react-i18next'
import {
  resolveConversationFromRoute,
  resolveConversationForSubmission,
} from './conversation-selection'
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog'
import { Spinner, toast } from '@heroui/react'
import { groupCitationsByDocument } from './citation-groups'
import { getChatDepartments } from './chat-context'

const ChatMarkdown = lazy(() =>
  import('./ChatMarkdown').then((module) => ({ default: module.ChatMarkdown })),
)

function ChatLoaderDots() {
  const { t } = useTranslation()
  return (
    <Spinner
      aria-label={t('chat.generating')}
      className="chat-loader-dots"
      size="sm"
    />
  )
}

function cleanAssistantOpening(content: string) {
  return content.replace(
    /^(?:(?:根据|基于)(?:当前|所选|提供的)?知识库(?:内容|资料)?|according to (?:the )?(?:provided )?(?:knowledge base|context))[，,:：\s]*/i,
    '',
  )
}

function CopyMessageButton({ content }: { content: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      aria-label={copied ? t('chat.messageCopied') : t('chat.copyMessage')}
      className="-mt-1 grid h-5 w-5 place-items-center rounded text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 focus-visible:opacity-100"
      type="button"
      onClick={() => void copy()}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

function MessageCard({
  item,
  onCitationsClick,
}: {
  item: ChatMessage
  onCitationsClick: (citations: Citation[]) => void
}) {
  const { t } = useTranslation()
  const isUser = item.role === 'USER'
  const content = isUser ? item.content : cleanAssistantOpening(item.content)

  return (
    <div
      className={`box-border max-w-[960px] text-sm leading-[1.6] ${
        isUser
          ? 'ml-auto w-fit rounded-bl-xl rounded-br-xl rounded-tl-xl bg-blue-50 px-3 py-2.5'
          : 'w-full py-1'
      }`}
    >
      {content ? (
        <div className="chat-markdown">
          <ChatMarkdown content={content} />
        </div>
      ) : null}
      {item.suggestions?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.suggestions.map((suggestion) => (
            <span
              className="rounded-full border border-current/15 bg-white/70 px-2.5 py-1 text-xs"
              key={suggestion}
            >
              {suggestion}
            </span>
          ))}
        </div>
      ) : null}
      {item.citations?.length ? (
        <div className="mt-2 flex w-full flex-wrap items-center gap-2">
          <b className="text-[11px] font-normal leading-[13px] text-slate-400">
            {t('chat.citations')}
          </b>
          {groupCitationsByDocument(item.citations).map((citations) => {
            const citation = citations[0]
            return (
              <span
                className="inline-flex items-center rounded-md bg-white/70 px-2 py-1 text-[11px] font-semibold leading-[13px] text-indigo-600"
                key={citation.documentId ?? citation.documentName}
              >
                <span aria-hidden="true">【</span>
                {citations.map((source, index) => (
                  <Fragment key={source.id ?? source.sourceNumber}>
                    {index ? <span aria-hidden="true">，</span> : null}
                    <button
                      aria-label={`${t('chat.sourceDocument')} ${source.sourceNumber}`}
                      className="cursor-pointer underline decoration-indigo-200 underline-offset-2 hover:text-indigo-800"
                      type="button"
                      onClick={() => onCitationsClick([source])}
                    >
                      {source.sourceNumber}
                    </button>
                  </Fragment>
                ))}
                <span aria-hidden="true">】</span>
                <span className="ml-1 text-slate-500">
                  {citation.documentName ?? t('chat.sourceDocument')}
                </span>
              </span>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function ChatPage() {
  const { t } = useTranslation()
  const { departmentId, conversationId } = useParams()
  const navigate = useNavigate()
  const user = useSessionStore((state) => state.currentUser)
  const token = useSessionStore((state) => state.accessToken)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sourcePanel, setSourcePanel] = useState<Citation[] | null>(null)
  const [starterQuestions, setStarterQuestions] = useState<string[]>([])
  const [starterQuestionsLoading, setStarterQuestionsLoading] = useState(false)
  const [readinessById, setReadinessById] = useState<
    Record<string, KnowledgeBaseReadiness>
  >({})
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)
  const conversationListRequestRef = useRef(0)
  const skipMessageLoadForRef = useRef<string | null>(null)
  const chatDepartmentIds = useMemo(
    () => getChatDepartments(user?.departments ?? []).map((item) => item.id),
    [user?.departments],
  )

  useEffect(() => {
    if (departmentId && chatDepartmentIds.includes(departmentId))
      localStorage.setItem('ai-workspace-chat-department-id', departmentId)
  }, [chatDepartmentIds, departmentId])

  useEffect(() => {
    if (!departmentId || !chatDepartmentIds.length) return
    const requestId = ++conversationListRequestRef.current
    let cancelled = false
    void Promise.all(chatDepartmentIds.map((id) => listConversations(id)))
      .then((groups) => {
        if (cancelled || requestId !== conversationListRequestRef.current)
          return
        const items = groups
          .flat()
          .sort(
            (left, right) =>
              new Date(right.updatedAt).getTime() -
              new Date(left.updatedAt).getTime(),
          )
        setConversations(items)
        const requestedConversation = conversationId
          ? items.find((item) => item.id === conversationId)
          : undefined
        const nextConversation = resolveConversationFromRoute(
          items,
          conversationId,
        )
        setActiveId(nextConversation?.id ?? null)

        if (conversationId && !requestedConversation) {
          navigate(
            nextConversation
              ? `/departments/${nextConversation.departmentId}/chat/${nextConversation.id}`
              : `/departments/${departmentId}/chat`,
            { replace: true },
          )
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [chatDepartmentIds, conversationId, departmentId, navigate])

  useEffect(() => {
    if (!chatDepartmentIds.length) return
    void Promise.all(chatDepartmentIds.map((id) => listKnowledgeBases(id)))
      .then((groups) => {
        const items = groups.flat()
        const preferred =
          items.find((item) => item.departmentId === departmentId) ?? items[0]
        setKnowledgeBases(items)
        setSelectedIds((current) =>
          current.length && items.some((item) => item.id === current[0])
            ? [current[0]]
            : preferred
              ? [preferred.id]
              : [],
        )
      })
      .catch(() => undefined)
  }, [chatDepartmentIds, departmentId])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      setMessagesLoading(false)
      return
    }
    if (activeId.startsWith('temp:')) {
      setMessagesLoading(false)
      return
    }
    if (skipMessageLoadForRef.current === activeId) {
      skipMessageLoadForRef.current = null
      setMessagesLoading(false)
      return
    }
    let cancelled = false
    setMessages([])
    setMessagesLoading(true)
    void getMessages(activeId)
      .then((items) => {
        if (!cancelled) setMessages(items)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setMessagesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeId])

  useEffect(() => {
    const activeConversation = conversations.find(
      (item) => item.id === activeId,
    )
    if (
      activeConversation &&
      knowledgeBases.some(
        (item) => item.id === activeConversation.knowledgeBaseId,
      )
    )
      setSelectedIds([activeConversation.knowledgeBaseId])
  }, [activeId, conversations, knowledgeBases])

  const selectedKnowledgeBase = knowledgeBases.find(
    (item) => item.id === selectedIds[0],
  )
  useEffect(() => {
    if (!selectedKnowledgeBase) {
      setStarterQuestions([])
      return
    }
    setStarterQuestionsLoading(true)
    void getKnowledgeBaseStarterQuestions(
      selectedKnowledgeBase.departmentId,
      selectedKnowledgeBase.id,
    )
      .then((data) => setStarterQuestions(data.questions))
      .catch(() => setStarterQuestions([]))
      .finally(() => setStarterQuestionsLoading(false))
  }, [selectedKnowledgeBase])

  useEffect(() => {
    if (!knowledgeBases.length) {
      setReadinessById({})
      return
    }
    let active = true
    setReadinessLoading(true)
    void Promise.all(
      knowledgeBases.map(async (base) => {
        try {
          return [
            base.id,
            await getKnowledgeBaseReadiness(base.departmentId, base.id),
          ] as const
        } catch {
          return null
        }
      }),
    )
      .then((entries) => {
        if (!active) return
        setReadinessById(
          Object.fromEntries(entries.filter((entry) => entry !== null)),
        )
      })
      .finally(() => {
        if (active) setReadinessLoading(false)
      })
    return () => {
      active = false
    }
  }, [knowledgeBases])

  useEffect(() => {
    setSourcePanel(null)
  }, [activeId])

  useEffect(() => {
    if (historyRef.current)
      historyRef.current.scrollTop = historyRef.current.scrollHeight
  }, [messages])

  const newConversation = async (knowledgeBaseId = selectedIds[0]) => {
    const selectedKnowledgeBase = knowledgeBases.find(
      (item) => item.id === knowledgeBaseId,
    )
    if (!user?.organization || !selectedKnowledgeBase) {
      toast.warning(t('chat.selectKnowledge'))
      return null
    }
    setSourcePanel(null)
    setMessages([])
    setActiveId(null)
    setDraft('')
    navigate(`/departments/${selectedKnowledgeBase.departmentId}/chat`)
    window.setTimeout(() => composerRef.current?.focus(), 0)
    return null
  }

  const switchKnowledgeBase = async (knowledgeBaseId: string) => {
    setSelectedIds([knowledgeBaseId])
    setIsPickerOpen(false)
    await newConversation(knowledgeBaseId)
  }

  const removeConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId)
      setSourcePanel(null)
      const remaining = conversations.filter(
        (item) => item.id !== conversationId,
      )
      setConversations(remaining)
      setDeleteTarget(null)

      if (conversationId === activeId) {
        const nextConversation = remaining[0] ?? null
        setMessages([])
        setActiveId(nextConversation?.id ?? null)
        navigate(
          nextConversation
            ? `/departments/${nextConversation.departmentId}/chat/${nextConversation.id}`
            : `/departments/${departmentId}/chat`,
        )
      }
    } catch {
      // Axios interceptor already displays the localized API error toast.
    }
  }

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || isStreaming) return
    if (!readinessById[selectedIds[0]]) {
      toast.danger(t('chat.readinessUnavailable'))
      return
    }
    if (readinessById[selectedIds[0]]?.status !== 'READY') {
      toast.warning(t('chat.notReady'))
      return
    }
    try {
      const now = new Date().toISOString()
      const streamingId = `stream-${Date.now()}`
      const selectedBase = selectedKnowledgeBase
      if (!selectedBase || !user?.organization) {
        toast.warning(t('chat.selectKnowledge'))
        return
      }
      let conversation = resolveConversationForSubmission(
        conversations,
        activeId,
        selectedBase.id,
      )
      let temporaryId: string | null = null
      setDraft('')
      setIsStreaming(true)
      setMessages((current) => [
        ...current,
        { id: `user-${Date.now()}`, role: 'USER', content, createdAt: now },
        { id: streamingId, role: 'ASSISTANT', content: '', createdAt: now },
      ])
      if (!conversation) {
        conversationListRequestRef.current += 1
        temporaryId = `temp:${crypto.randomUUID()}`
        const temporaryConversation: Conversation = {
          id: temporaryId,
          title: content.slice(0, 60),
          organizationId: user.organization.id,
          departmentId: selectedBase.departmentId,
          knowledgeBaseId: selectedBase.id,
          updatedAt: now,
          clientStatus: 'creating',
          messages: [{ role: 'USER', content, createdAt: now }],
        }
        conversation = temporaryConversation
        setConversations((current) => [temporaryConversation, ...current])
        setActiveId(temporaryId)
      } else {
        setConversations((current) =>
          current.map((item) =>
            item.id === conversation?.id
              ? {
                  ...item,
                  messages: [{ role: 'USER', content, createdAt: now }],
                }
              : item,
          ),
        )
      }

      if (temporaryId) {
        try {
          const created = await createConversation({
            organizationId: user.organization.id,
            departmentId: selectedBase.departmentId,
            knowledgeBaseId: selectedBase.id,
            title: content.slice(0, 60),
          })
          setConversations((current) =>
            current.map((item) =>
              item.id === temporaryId
                ? { ...created, messages: item.messages }
                : item,
            ),
          )
          skipMessageLoadForRef.current = created.id
          setActiveId(created.id)
          navigate(`/departments/${created.departmentId}/chat/${created.id}`, {
            replace: true,
          })
          conversation = created
        } catch (creationError) {
          setConversations((current) =>
            current.map((item) =>
              item.id === temporaryId
                ? { ...item, clientStatus: 'failed' }
                : item,
            ),
          )
          setDraft(content)
          throw creationError
        }
      }
      await streamMessage(conversation.id, content, token, (event) => {
        if (event.type === 'delta' && event.content)
          setMessages((current) =>
            current.map((item) =>
              item.id === streamingId
                ? { ...item, content: item.content + event.content }
                : item,
            ),
          )
        if (event.type === 'citations' && event.citations)
          setMessages((current) =>
            current.map((item) =>
              item.id === streamingId
                ? { ...item, citations: event.citations }
                : item,
            ),
          )
        if (event.type === 'retrieval')
          setMessages((current) =>
            current.map((item) =>
              item.id === streamingId
                ? {
                    ...item,
                    content: event.message ?? item.content,
                    retrievalStatus: event.status,
                    suggestions: event.suggestions,
                  }
                : item,
            ),
          )
        if (event.type === 'error')
          toast.danger(event.message ?? t('api.error'))
      })
      setMessages(await getMessages(conversation.id))
    } catch {
      toast.danger(t('api.error'))
    } finally {
      setIsStreaming(false)
    }
  }

  const selectedKnowledgeBases = knowledgeBases.filter((item) =>
    selectedIds.includes(item.id),
  )
  const selectedReadiness = readinessById[selectedIds[0]]
  const knowledgeBaseReady = selectedReadiness?.status === 'READY'
  const visible = conversations.filter((item) =>
    (item.title ?? t('chat.untitled'))
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  )

  return (
    <section
      className={`grid h-full min-h-0 grid-cols-[minmax(0,1fr)] overflow-hidden bg-slate-50 font-sans text-slate-900 ${sourcePanel ? 'lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_760px]' : 'lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]'}`}
    >
      <aside className="flex min-h-0 flex-col gap-4 overflow-hidden border-r border-slate-200 bg-white p-4 max-lg:hidden">
        <header className="flex items-center justify-between gap-2 whitespace-nowrap">
          <h1 className="min-w-0 truncate text-sm font-semibold">
            {t('chat.history')}
          </h1>
          <button
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
            type="button"
            onClick={() => void newConversation()}
          >
            {t('chat.new')}
          </button>
        </header>
        <label className="flex h-8 items-center gap-2 rounded-lg bg-slate-50 px-2 text-slate-400">
          <Search size={18} />
          <input
            className="min-w-0 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('chat.search')}
          />
        </label>
        <div className="grid min-h-0 gap-1 overflow-auto">
          {visible.map((item) => (
            <div
              key={item.id}
              className={`group relative grid gap-1.5 rounded-lg border p-3 pr-9 text-left ${item.id === activeId ? 'border-slate-200 bg-indigo-50' : 'border-transparent bg-transparent hover:bg-slate-50'}`}
            >
              <button
                className="grid min-w-0 cursor-pointer gap-1.5 text-left"
                onClick={() => {
                  if (item.clientStatus === 'failed') {
                    setSelectedIds([item.knowledgeBaseId])
                    setDraft(item.messages?.[0]?.content ?? '')
                    setConversations((current) =>
                      current.filter(
                        (conversation) => conversation.id !== item.id,
                      ),
                    )
                    setMessages([])
                    setActiveId(null)
                    navigate(`/departments/${item.departmentId}/chat`)
                    return
                  }
                  setSourcePanel(null)
                  setActiveId(item.id)
                  navigate(`/departments/${item.departmentId}/chat/${item.id}`)
                }}
                type="button"
              >
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <strong
                    className={`min-w-0 flex-1 truncate text-[13px] ${item.id === activeId ? 'text-indigo-600' : 'text-slate-600'}`}
                  >
                    {item.title ?? t('chat.untitled')}
                  </strong>
                  {item.clientStatus === 'creating' ? (
                    <span className="text-[10px] text-indigo-500">…</span>
                  ) : item.clientStatus === 'failed' ? (
                    <span className="text-[10px] text-rose-500">
                      {t('chat.retry', { defaultValue: 'Retry' })}
                    </span>
                  ) : null}
                  <time className="shrink-0 text-[11px] text-slate-400">
                    {new Date(item.updatedAt).toLocaleDateString('zh-CN')}
                  </time>
                </span>
                <small className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Folder size={15} />
                  {knowledgeBases.find(
                    (base) => base.id === item.knowledgeBaseId,
                  )?.name ?? t('chat.enterpriseKnowledge')}
                </small>
              </button>
              {!item.id.startsWith('temp:') ? (
                <button
                  aria-label={t('chat.deleteConversation', {
                    title: item.title ?? t('chat.untitled'),
                  })}
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 focus:opacity-100"
                  onClick={() => setDeleteTarget(item.id)}
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </aside>
      <main className="flex min-w-0 min-h-0 flex-col">
        <div
          className="grid min-h-0 flex-1 content-start gap-0 overflow-auto px-6 py-5 max-sm:px-4 max-sm:py-4"
          ref={historyRef}
        >
          {messagesLoading ? (
            <section className="grid min-h-40 place-items-center">
              <ChatLoaderDots />
            </section>
          ) : !messages.length ? (
            <section className="mx-auto w-full max-w-[640px] text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <Sparkles size={26} />
              </span>
              <h2 className="mb-2 mt-[18px] text-xl font-bold">
                {t('chat.greeting')}
              </h2>
              <p className="mx-auto max-w-[600px] text-[13px] leading-5 text-slate-500">
                {t('chat.intro')}
              </p>
              {!readinessLoading &&
              selectedReadiness?.status === 'NOT_READY' ? (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm leading-6 text-amber-800">
                  {t('chat.notReady')}
                </div>
              ) : !readinessLoading &&
                selectedKnowledgeBase &&
                !selectedReadiness ? (
                <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm leading-6 text-rose-700">
                  {t('chat.readinessUnavailable')}
                </div>
              ) : null}
              {!starterQuestionsLoading && starterQuestions.length ? (
                <div className="mt-9 grid gap-2.5 text-left">
                  {starterQuestions.map((question) => (
                    <button
                      key={question}
                      className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
                      type="button"
                      onClick={() => setDraft(question)}
                    >
                      <MessageSquare size={16} className="text-indigo-600" />
                      <span className="flex-1">{question}</span>
                      <ArrowRight size={15} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ) : (
            <Suspense
              fallback={
                <section className="grid min-h-40 place-items-center">
                  <ChatLoaderDots />
                </section>
              }
            >
              {messages.map((item, index) => {
                const pendingAssistant =
                  isStreaming &&
                  item.role === 'ASSISTANT' &&
                  item.id.startsWith('stream-') &&
                  !item.content.trim()

                return (
                  <article
                    className={`relative mx-auto w-full max-w-[960px] ${
                      index === 0
                        ? ''
                        : item.role === 'USER'
                          ? 'mt-6'
                          : messages[index - 1]?.role === 'USER'
                            ? 'mt-2'
                            : 'mt-3'
                    }`}
                    key={item.id}
                  >
                    {pendingAssistant ? (
                      <div className="py-1">
                        <ChatLoaderDots />
                      </div>
                    ) : item.role === 'USER' ? (
                      <div className="group flex w-full flex-col items-end gap-1.5">
                        <span className="absolute -right-12 top-0 grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-slate-200 max-sm:hidden">
                          <UserRound size={17} />
                        </span>
                        <strong className="text-xs font-semibold leading-[15px] text-slate-600">
                          {user?.username ?? t('chat.analyst')}
                        </strong>
                        <MessageCard
                          item={item}
                          onCitationsClick={setSourcePanel}
                        />
                        <CopyMessageButton content={item.content} />
                      </div>
                    ) : (
                      <div className="flex w-full flex-col gap-2">
                        <span className="absolute -left-12 top-0 grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white max-sm:hidden">
                          <Sparkles size={18} />
                        </span>
                        <header className="flex items-center gap-2">
                          <strong className="text-xs font-semibold leading-[15px] text-indigo-600">
                            {t('chat.assistant')}
                          </strong>
                          <em
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold leading-3 not-italic ${
                              item.retrievalStatus &&
                              item.retrievalStatus !== 'grounded'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {item.retrievalStatus &&
                            item.retrievalStatus !== 'grounded'
                              ? t(`chat.retrieval.${item.retrievalStatus}`)
                              : t('chat.grounded')}
                          </em>
                        </header>
                        <MessageCard
                          item={item}
                          onCitationsClick={setSourcePanel}
                        />
                      </div>
                    )}
                  </article>
                )
              })}
            </Suspense>
          )}
        </div>
        <form
          className="mx-auto mb-5 box-border w-[min(960px,calc(100%-48px))] rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm max-sm:mb-3 max-sm:w-[calc(100%-24px)] max-sm:p-3"
          ref={formRef}
          onSubmit={(event) => void send(event)}
        >
          <div className="flex items-center justify-between">
            <div className="relative">
              <button
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600"
                type="button"
                onClick={() => setIsPickerOpen((open) => !open)}
              >
                <BookOpen size={14} />
                {t('chat.source')}:{' '}
                {selectedKnowledgeBases[0]?.name ?? t('chat.selectKnowledge')}
                <ChevronDown size={12} />
              </button>
              {isPickerOpen ? (
                <div className="absolute bottom-[calc(100%+12px)] left-0 z-10 grid w-[420px] gap-1 rounded-xl border border-slate-200 bg-white p-4 shadow-lg max-sm:w-[calc(100vw-112px)]">
                  <label className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-400">
                    <Search size={14} />
                    <input
                      className="bg-transparent text-xs outline-none"
                      placeholder={t('chat.searchKnowledge')}
                    />
                  </label>
                  {knowledgeBases.map((base) => (
                    <button
                      className="grid cursor-pointer grid-cols-[16px_1fr_auto] items-center gap-2.5 rounded-md p-2 text-left hover:bg-indigo-50"
                      type="button"
                      key={base.id}
                      onClick={() => void switchKnowledgeBase(base.id)}
                    >
                      <i
                        className={`grid h-[14px] w-[14px] place-items-center rounded border ${selectedIds.includes(base.id) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400'}`}
                      >
                        {selectedIds.includes(base.id) ? (
                          <Check size={11} />
                        ) : null}
                      </i>
                      <strong className="text-[13px]">{base.name}</strong>
                      <small className="text-[11px] text-slate-600">
                        {readinessById[base.id]?.status === 'READY'
                          ? t('chat.ready')
                          : readinessById[base.id]
                            ? t('chat.waitingForPublish')
                            : t('chat.readinessUnknown')}
                      </small>
                    </button>
                  ))}
                  <footer className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-600">
                    {t('chat.singleKnowledgeHint')}
                  </footer>
                </div>
              ) : null}
            </div>
            <small className="text-[11px] text-slate-400 max-sm:hidden">
              {t('chat.markdownHint')}
            </small>
          </div>
          <div className="mt-3 flex items-center gap-3 text-slate-600">
            <Paperclip size={20} />
            <textarea
              ref={composerRef}
              className="min-w-0 flex-1 resize-none border-0 bg-transparent text-sm leading-5 outline-none"
              disabled={readinessLoading || !knowledgeBaseReady}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  formRef.current?.requestSubmit()
                }
              }}
              placeholder={
                readinessLoading
                  ? t('chat.checkingReadiness')
                  : knowledgeBaseReady
                    ? t('chat.placeholder')
                    : selectedReadiness
                      ? t('chat.notReadyShort')
                      : t('chat.readinessUnknown')
              }
              rows={1}
            />
            <button
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-indigo-600 text-white disabled:cursor-not-allowed disabled:opacity-45"
              type="submit"
              disabled={!draft.trim() || isStreaming || !knowledgeBaseReady}
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </form>
      </main>
      {sourcePanel ? (
        <aside className="flex min-h-0 w-[760px] flex-col gap-4 overflow-auto border-l border-slate-200 bg-white p-5 max-2xl:fixed max-2xl:inset-y-0 max-2xl:right-0 max-2xl:z-40 max-2xl:w-[min(760px,calc(100vw-64px))] max-2xl:shadow-2xl max-sm:w-full">
          <header className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <FileText size={16} />
              <h2 className="text-sm font-bold text-slate-900">
                {t('chat.sourcePanelTitle')}
              </h2>
            </span>
            <button
              className="cursor-pointer text-slate-400"
              onClick={() => setSourcePanel(null)}
            >
              <X size={17} />
            </button>
          </header>
          <p className="text-xs leading-[15px] text-slate-600">
            {t('chat.sourcePanelIntro')}
          </p>
          <div className="grid gap-3.5">
            {groupCitationsByDocument(sourcePanel).map((citations) => {
              const citation = citations[0]
              return (
                <article
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                  key={citation.documentId ?? citation.documentName}
                >
                  <header className="flex items-center justify-between">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <b className="rounded bg-indigo-600 px-1 py-0.5 text-[11px] text-white">
                        [{citations.map((item) => item.sourceNumber).join(', ')}
                        ]
                      </b>
                      <strong className="truncate text-xs">
                        {citation.documentName ?? t('chat.relatedDocument')}
                      </strong>
                    </span>
                    <em className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] not-italic text-emerald-600">
                      {t('chat.relevance')}
                    </em>
                  </header>
                  <div className="my-2.5 grid gap-2">
                    {citations.map((item) => (
                      <div
                        className="rounded-md border border-slate-200 bg-white p-2.5 text-xs leading-[18px] text-slate-600"
                        key={
                          item.id ?? item.documentChunkId ?? item.sourceNumber
                        }
                      >
                        <b className="mb-1.5 block text-indigo-600">
                          [{item.sourceNumber}]
                        </b>
                        <div className="chat-markdown chat-markdown-compact">
                          <ChatMarkdown
                            content={
                              item.quote ?? item.content ?? t('chat.noQuote')
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={!citation.documentId}
                    onClick={() => {
                      if (!citation.documentId) return
                      const query = new URLSearchParams()
                      if (citation.documentChunkId)
                        query.set('chunk', citation.documentChunkId)
                      if (departmentId) query.set('departmentId', departmentId)
                      if (selectedKnowledgeBase?.id)
                        query.set('knowledgeBaseId', selectedKnowledgeBase.id)
                      if (conversationId)
                        query.set('conversationId', conversationId)
                      query.set('from', 'chat')
                      navigate(
                        `/documents/${citation.documentId}?${query.toString()}`,
                      )
                    }}
                    className="cursor-pointer text-[11px] font-semibold text-indigo-600 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {t('chat.openSource')}
                  </button>
                </article>
              )
            })}
          </div>
        </aside>
      ) : null}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('chat.deleteConversationTitle', {
          defaultValue: '删除对话？',
        })}
        description={t('chat.deleteConversationDescription', {
          defaultValue: '删除后无法恢复，请确认是否继续。',
        })}
        confirmLabel={t('actions.delete', { defaultValue: '删除' })}
        cancelLabel={t('actions.cancel', { defaultValue: '取消' })}
        destructive
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void removeConversation(deleteTarget)
        }}
      />
    </section>
  )
}
