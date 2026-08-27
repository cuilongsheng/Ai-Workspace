import {
  CheckCircle2,
  Download,
  FileSearch,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  createDocumentChunk,
  deleteDocumentChunk,
  downloadDocument,
  getDocument,
  getDocumentPreview,
  getDocumentPreviewContent,
  listDocumentChunks,
  publishDocument,
  startDocumentReview,
  updateDocumentChunk,
  type DocumentChunk,
  type KnowledgeDocument,
} from '../../api/knowledge-bases'
import { useSessionStore } from '../../store/session-store'
import { useLocaleText } from '../../i18n/useLocaleText'
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog'
import { toast } from '@heroui/react'

const ChatMarkdown = lazy(() =>
  import('../chat/ChatMarkdown').then((module) => ({
    default: module.ChatMarkdown,
  })),
)

export function DocumentReviewPage() {
  const { text } = useLocaleText()
  const statusLabel = (status: string) =>
    ({
      UPLOADING: text('上传中', 'Uploading'),
      PROCESSING: text('正在解析', 'Processing'),
      PARSED: text('待审核', 'Ready for review'),
      REVIEWING: text('审核中', 'Reviewing'),
      PUBLISHED: text('已发布，可用于 Chat', 'Published, available in Chat'),
      FAILED: text('解析失败', 'Failed'),
      ARCHIVED: text('已归档', 'Archived'),
    })[status] ?? status
  const { documentId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const focusedChunkId = searchParams.get('chunk')
  const routeDepartmentId = searchParams.get('departmentId')
  const user = useSessionStore((state) => state.currentUser)
  const permissions = useMemo(
    () => new Set(user?.departments.flatMap((item) => item.permissions) ?? []),
    [user],
  )
  const canReview = permissions.has('document.review')
  const canPublish = permissions.has('document.publish')
  const [item, setItem] = useState<KnowledgeDocument | null>(null)
  const [chunks, setChunks] = useState<DocumentChunk[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [newContent, setNewContent] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewContent, setPreviewContent] = useState<{
    type: 'html' | 'text' | 'unsupported'
    content: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [deleteChunkId, setDeleteChunkId] = useState<string | null>(null)
  const [previewChunkId, setPreviewChunkId] = useState<string | null>(null)
  const [activeChunkId, setActiveChunkId] = useState<string | null>(
    focusedChunkId,
  )

  const load = useCallback(async () => {
    if (!documentId) return
    setLoading(true)
    try {
      const [documentItem, chunkItems] = await Promise.all([
        getDocument(documentId),
        listDocumentChunks(documentId),
      ])
      setItem(documentItem)
      setChunks(chunkItems)
      setDrafts(
        Object.fromEntries(
          chunkItems.map((chunk) => [chunk.id, chunk.content]),
        ),
      )
    } catch {
      // The API client displays the localized HeroUI toast.
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!documentId || !item) return
    let active = true
    let objectUrl = ''
    setPreviewUrl('')
    setPreviewContent(null)
    if (item.mimeType === 'application/pdf') {
      void getDocumentPreview(documentId)
        .then((blob) => {
          if (!active) return
          objectUrl = URL.createObjectURL(blob)
          setPreviewUrl(objectUrl)
        })
        .catch(() => undefined)
    } else {
      void getDocumentPreviewContent(documentId)
        .then((content) => {
          if (active) setPreviewContent(content)
        })
        .catch(() => undefined)
    }
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [documentId, item])

  useEffect(() => {
    if (!focusedChunkId || loading) return
    setActiveChunkId(focusedChunkId)
    window.setTimeout(
      () =>
        globalThis.document
          .getElementById(`chunk-${focusedChunkId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      0,
    )
  }, [focusedChunkId, loading])

  const startReview = async () => {
    setSaving('review')
    try {
      setItem(await startDocumentReview(documentId))
    } catch {
      // The API client displays the localized HeroUI toast.
    } finally {
      setSaving('')
    }
  }

  const publish = async () => {
    setSaving('publish')
    try {
      setItem(await publishDocument(documentId))
    } catch {
      // The API client displays the localized HeroUI toast.
    } finally {
      setSaving('')
    }
  }

  const addChunk = async () => {
    if (!newContent.trim()) return
    setSaving('new')
    try {
      const chunk = await createDocumentChunk(documentId, newContent.trim())
      setChunks((current) => [...current, chunk])
      setDrafts((current) => ({ ...current, [chunk.id]: chunk.content }))
      setNewContent('')
    } catch {
      // The API client displays the localized HeroUI toast.
    } finally {
      setSaving('')
    }
  }

  const saveChunk = async (chunkId: string) => {
    const content = drafts[chunkId]?.trim()
    if (!content) {
      toast.warning(text('Chunk 内容不能为空。', 'Chunk content is required.'))
      return
    }
    setSaving(chunkId)
    try {
      const chunk = await updateDocumentChunk(chunkId, content)
      setChunks((current) =>
        current.map((existing) => (existing.id === chunkId ? chunk : existing)),
      )
      setDrafts((current) => ({ ...current, [chunkId]: chunk.content }))
    } catch {
      // The API client displays the localized HeroUI toast.
    } finally {
      setSaving('')
    }
  }

  const removeChunk = async (chunkId: string) => {
    setSaving(chunkId)
    try {
      await deleteDocumentChunk(chunkId)
      setDeleteChunkId(null)
      setChunks((current) => current.filter((chunk) => chunk.id !== chunkId))
    } catch {
      // The API client displays the localized HeroUI toast.
    } finally {
      setSaving('')
    }
  }

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={18} />{' '}
        {text('正在加载文档…', 'Loading document…')}
      </div>
    )

  if (!item)
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-8 text-center">
        <div>
          <h1 className="font-semibold">
            {text('无法打开文档', 'Unable to open document')}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {text(
              '文档不存在，或当前账号没有查看权限。',
              'The document does not exist or you do not have access.',
            )}
          </p>
          <Link
            className="mt-5 inline-block text-sm text-indigo-600"
            to={
              routeDepartmentId
                ? `/departments/${routeDepartmentId}/knowledge-bases`
                : '/'
            }
          >
            {text('返回工作区', 'Back to workspace')}
          </Link>
        </div>
      </div>
    )

  const editable = item.status === 'REVIEWING' && canReview
  const isPdf = item.mimeType === 'application/pdf'

  return (
    <div className="min-h-full bg-slate-50 p-8 text-slate-900 max-md:p-4">
      <header className="mb-6 flex items-start justify-between gap-6 max-md:flex-col">
        <div>
          <h1 className="text-xl font-semibold">{item.name}</h1>
          <p className="mt-1 text-xs text-slate-500">
            {item.name} · {statusLabel(item.status)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void downloadDocument(item.id, item.name)}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <Download size={15} /> {text('下载原文', 'Download source')}
          </button>
          {item.status === 'PARSED' && canReview ? (
            <button
              disabled={saving === 'review'}
              onClick={() => void startReview()}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {text('开始审核', 'Start review')}
            </button>
          ) : null}
          {item.status === 'REVIEWING' && canPublish ? (
            <button
              disabled={saving === 'publish'}
              onClick={() => void publish()}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              <CheckCircle2 size={15} /> {text('发布文档', 'Publish')}
            </button>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)] gap-6 max-xl:grid-cols-1">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <FileSearch size={16} className="text-indigo-600" />{' '}
              {text('原文预览', 'Source preview')}
            </h2>
          </header>
          {previewUrl && isPdf ? (
            <iframe
              title={`${item.name} ${text('原文预览', 'source preview')}`}
              src={previewUrl}
              className="h-[72vh] w-full"
            />
          ) : previewContent?.type === 'html' ? (
            <iframe
              title={`${item.name} ${text('DOCX 预览', 'DOCX preview')}`}
              sandbox=""
              srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,-apple-system,sans-serif;line-height:1.75;color:#1e293b;padding:32px;max-width:900px;margin:auto}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #cbd5e1;padding:8px}h1,h2,h3{color:#0f172a}</style></head><body>${previewContent.content}</body></html>`}
              className="h-[72vh] w-full bg-white"
            />
          ) : previewContent?.type === 'text' ? (
            <div className="chat-markdown h-[72vh] overflow-auto p-8 text-sm text-slate-700">
              <Suspense
                fallback={
                  <div className="text-sm text-slate-400">
                    {text('正在加载预览…', 'Loading preview…')}
                  </div>
                }
              >
                <ChatMarkdown content={previewContent.content} />
              </Suspense>
            </div>
          ) : (
            <div className="grid h-[72vh] place-items-center p-8 text-center text-sm text-slate-500">
              <div>
                <FileSearch className="mx-auto mb-3 text-slate-300" size={38} />
                <p>
                  {text(
                    '当前格式无法在页面内精确预览。',
                    'This format cannot be previewed precisely in the page.',
                  )}
                </p>
                <p className="mt-1 text-xs">
                  {text(
                    '右侧 Chunk 可用于审核和定位，原文件可下载查看。',
                    'Use the chunks for review and location, or download the original file.',
                  )}
                </p>
                {previewUrl ? (
                  <a
                    className="mt-4 inline-block text-indigo-600"
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {text('尝试在新窗口打开', 'Try opening in a new window')}
                  </a>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">
                {text('Chunk 审核', 'Chunk review')}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {text('共', 'Total')} {chunks.length} {text('个片段', 'chunks')}
              </p>
            </div>
            {!editable ? (
              <span className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
                {text('只读', 'Read only')}
              </span>
            ) : null}
          </header>
          <div className="max-h-[72vh] space-y-3 overflow-auto p-4">
            {editable ? (
              <div className="rounded-lg border border-dashed border-indigo-300 bg-indigo-50/40 p-3">
                <textarea
                  value={newContent}
                  onChange={(event) => setNewContent(event.target.value)}
                  placeholder={text(
                    '新增人工知识片段…',
                    'Add a reviewed knowledge chunk…',
                  )}
                  className="min-h-24 w-full resize-y rounded-md border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-500"
                />
                <button
                  disabled={!newContent.trim() || saving === 'new'}
                  onClick={() => void addChunk()}
                  className="mt-2 flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-xs text-white disabled:opacity-50"
                >
                  <Plus size={14} /> {text('新增 Chunk', 'Add chunk')}
                </button>
              </div>
            ) : null}
            {chunks.map((chunk) => {
              const focused = activeChunkId === chunk.id
              return (
                <article
                  id={`chunk-${chunk.id}`}
                  key={chunk.id}
                  onClick={() => setActiveChunkId(chunk.id)}
                  className={`rounded-lg border p-3 ${focused ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200'}`}
                >
                  <header className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Chunk #{chunk.chunkIndex + 1} · {chunk.charCount}{' '}
                      {text('字符', 'characters')}
                    </span>
                    <span className="flex items-center gap-2">
                      {chunk.embeddingModel
                        ? text('已向量化', 'Embedded')
                        : text('未向量化', 'Not embedded')}
                      {editable ? (
                        <span className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white">
                          <button
                            className={`px-2 py-1 text-[11px] ${previewChunkId !== chunk.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setPreviewChunkId(null)
                            }}
                          >
                            {text('编辑', 'Edit')}
                          </button>
                          <button
                            className={`border-l border-slate-200 px-2 py-1 text-[11px] ${previewChunkId === chunk.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setPreviewChunkId(chunk.id)
                            }}
                          >
                            {text('预览', 'Preview')}
                          </button>
                        </span>
                      ) : null}
                    </span>
                  </header>
                  {editable ? (
                    previewChunkId === chunk.id ? (
                      <div className="chat-markdown chat-markdown-compact min-h-56 max-h-96 overflow-auto rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
                        <Suspense
                          fallback={
                            <span className="text-xs text-slate-400">
                              {text('正在加载预览…', 'Loading preview…')}
                            </span>
                          }
                        >
                          <ChatMarkdown
                            content={drafts[chunk.id] ?? chunk.content}
                          />
                        </Suspense>
                      </div>
                    ) : (
                      <textarea
                        value={drafts[chunk.id] ?? chunk.content}
                        onFocus={() => setActiveChunkId(chunk.id)}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [chunk.id]: event.target.value,
                          }))
                        }
                        className="min-h-56 w-full resize-y rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 outline-none focus:border-indigo-500"
                      />
                    )
                  ) : (
                    <div className="chat-markdown chat-markdown-compact max-h-96 overflow-auto text-sm text-slate-700">
                      <Suspense
                        fallback={
                          <span className="text-xs text-slate-400">
                            {text('正在加载预览…', 'Loading preview…')}
                          </span>
                        }
                      >
                        <ChatMarkdown
                          content={drafts[chunk.id] ?? chunk.content}
                        />
                      </Suspense>
                    </div>
                  )}
                  {editable ? (
                    <footer className="mt-2 flex justify-end gap-2">
                      <button
                        disabled={saving === chunk.id}
                        onClick={() => void saveChunk(chunk.id)}
                        className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs"
                      >
                        <Save size={13} /> {text('保存', 'Save')}
                      </button>
                      <button
                        disabled={saving === chunk.id}
                        onClick={() => setDeleteChunkId(chunk.id)}
                        className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-rose-600"
                      >
                        <Trash2 size={13} /> {text('删除', 'Delete')}
                      </button>
                    </footer>
                  ) : null}
                </article>
              )
            })}
            {!chunks.length ? (
              <div className="py-16 text-center text-sm text-slate-500">
                {text('暂无 Chunk', 'No chunks')}
              </div>
            ) : null}
          </div>
        </section>
      </div>
      <ConfirmDialog
        open={Boolean(deleteChunkId)}
        title={text('删除知识片段？', 'Delete chunk?')}
        description={text(
          '该片段及其向量索引将被删除，此操作无法撤销。',
          'The chunk and its vector index will be deleted. This cannot be undone.',
        )}
        confirmLabel={text('确认删除', 'Delete')}
        cancelLabel={text('取消', 'Cancel')}
        destructive
        busy={Boolean(deleteChunkId && saving === deleteChunkId)}
        onClose={() => setDeleteChunkId(null)}
        onConfirm={() => {
          if (deleteChunkId) void removeChunk(deleteChunkId)
        }}
      />
    </div>
  )
}
