import {
  Archive,
  BookOpen,
  Download,
  Eye,
  FileSearch,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  archiveDocument,
  archiveKnowledgeBase,
  createKnowledgeBase,
  downloadDocument,
  getDocumentPreview,
  getDocumentPreviewContent,
  getKnowledgeBaseStarterQuestions,
  listDocuments,
  listKnowledgeBases,
  reprocessDocument,
  updateKnowledgeBase,
  updateKnowledgeBaseStarterQuestions,
  uploadDocument,
  type KnowledgeBase,
  type KnowledgeDocument,
} from '../../api/knowledge-bases'
import { useSessionStore } from '../../store/session-store'
import { useLocaleText } from '../../i18n/useLocaleText'
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog'
import { AppSelect } from '../../components/forms/AppSelect'
import { useTranslation } from 'react-i18next'
import { localizedName } from '../../i18n/localized-name'
import { toast } from '@heroui/react'

const DOCUMENT_PAGE_SIZE = 20

export function KnowledgeBasePage() {
  const { text } = useLocaleText()
  const { i18n } = useTranslation()
  const user = useSessionStore((state) => state.currentUser)
  const navigate = useNavigate()
  const {
    departmentId: routeDepartmentId,
    knowledgeBaseId: routeKnowledgeBaseId,
  } = useParams()
  const departmentId =
    routeDepartmentId ?? user?.departments.find((d) => d.id)?.id
  const canManage = user?.departments.some(
    (department) =>
      department.id === departmentId &&
      department.roles.some((role) => role.name === 'DEPARTMENT_ADMIN'),
  )
  const canReview = user?.departments.some(
    (department) =>
      department.id === departmentId &&
      department.permissions.includes('document.review'),
  )
  const [items, setItems] = useState<KnowledgeBase[]>([]),
    [selected, setSelected] = useState<KnowledgeBase | null>(null),
    [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [documentPage, setDocumentPage] = useState(1),
    [documentTotal, setDocumentTotal] = useState(0)
  const [createOpen, setCreateOpen] = useState(false),
    [editOpen, setEditOpen] = useState(false),
    [archiveOpen, setArchiveOpen] = useState(false),
    [archiveTarget, setArchiveTarget] = useState<KnowledgeBase | null>(null),
    [name, setName] = useState(''),
    [description, setDescription] = useState(''),
    [query, setQuery] = useState(''),
    [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE'>('ALL')
  const [starterOpen, setStarterOpen] = useState(false)
  const [starterQuestions, setStarterQuestions] = useState<string[]>([])
  const [starterSaving, setStarterSaving] = useState(false)
  const refresh = useCallback(async (id: string, page: number) => {
    if (!id) return
    try {
      const result = await listDocuments(id, page, DOCUMENT_PAGE_SIZE)
      if (result.items.length === 0 && result.total > 0 && page > 1) {
        setDocumentPage(page - 1)
        return
      }
      setDocuments(result.items)
      setDocumentTotal(result.total)
    } catch {
      // The API client displays the localized HeroUI toast.
    }
  }, [])
  useEffect(() => {
    if (!departmentId) return
    void listKnowledgeBases(departmentId)
      .then((nextItems) => {
        setItems(nextItems)
        if (!routeKnowledgeBaseId) {
          setSelected(null)
          return
        }
        const nextSelected = nextItems.find(
          (item) => item.id === routeKnowledgeBaseId,
        )
        setSelected(nextSelected ?? null)
      })
      .catch(() => undefined)
  }, [departmentId, routeKnowledgeBaseId])
  useEffect(() => {
    setDocuments([])
    setDocumentTotal(0)
    setDocumentPage(1)
  }, [selected?.id])
  useEffect(() => {
    if (selected) void refresh(selected.id, documentPage)
  }, [selected, documentPage, refresh])
  useEffect(() => {
    if (
      !selected ||
      !documents.some((d) => ['UPLOADING', 'PROCESSING'].includes(d.status))
    )
      return
    const timer = window.setInterval(
      () => void refresh(selected.id, documentPage),
      3000,
    )
    return () => window.clearInterval(timer)
  }, [documents, selected, documentPage, refresh])
  const create = async () => {
    if (!departmentId || !name.trim()) return
    try {
      const item = await createKnowledgeBase(departmentId, {
        name: name.trim(),
        description: description.trim() || null,
      })
      setItems((all) => [item, ...all])
      setCreateOpen(false)
      setName('')
      setDescription('')
    } catch {
      // The API client displays the localized HeroUI toast.
    }
  }
  const edit = async () => {
    if (!departmentId || !selected || !name.trim()) return
    try {
      const item = await updateKnowledgeBase(departmentId, selected.id, {
        name: name.trim(),
        description: description.trim() || null,
      })
      setItems((current) =>
        current.map((existing) => (existing.id === item.id ? item : existing)),
      )
      setSelected(item)
      setEditOpen(false)
    } catch {
      // The API client displays the localized HeroUI toast.
    }
  }
  const archive = async () => {
    const target = archiveTarget ?? selected
    if (!departmentId || !target) return
    try {
      await archiveKnowledgeBase(departmentId, target.id)
      setItems((all) => all.filter((item) => item.id !== target.id))
      setArchiveOpen(false)
      setArchiveTarget(null)
      if (selected?.id === target.id) {
        setSelected(null)
        navigate(`/departments/${departmentId}/knowledge-bases`)
      }
    } catch {
      // The API client displays the localized HeroUI toast.
    }
  }
  const openStarterQuestions = async () => {
    if (!departmentId || !selected) return
    try {
      const data = await getKnowledgeBaseStarterQuestions(
        departmentId,
        selected.id,
      )
      setStarterQuestions(data.questions)
      setStarterOpen(true)
    } catch {
      // The API client displays the localized HeroUI toast.
    }
  }
  const saveStarterQuestions = async () => {
    if (!departmentId || !selected) return
    setStarterSaving(true)
    try {
      const data = await updateKnowledgeBaseStarterQuestions(
        departmentId,
        selected.id,
        starterQuestions,
      )
      setStarterQuestions(data.questions)
      setStarterOpen(false)
    } catch {
      // The API client displays the localized HeroUI toast.
    } finally {
      setStarterSaving(false)
    }
  }
  const visible = items.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) &&
      (statusFilter === 'ALL' || item.status === statusFilter),
  )
  return (
    <div className="min-h-full bg-slate-50 p-8 font-sans text-slate-900 max-md:p-4">
      {selected ? (
        <Detail
          selected={selected}
          documents={documents}
          documentPage={documentPage}
          documentTotal={documentTotal}
          pageSize={DOCUMENT_PAGE_SIZE}
          refresh={() => refresh(selected.id, documentPage)}
          setDocumentPage={setDocumentPage}
          archive={() => {
            setArchiveTarget(selected)
            setArchiveOpen(true)
          }}
          edit={() => {
            setName(selected.name)
            setDescription(selected.description ?? '')
            setEditOpen(true)
          }}
          configureQuestions={() => void openStarterQuestions()}
          canManage={Boolean(canManage)}
          canReview={Boolean(canReview)}
        />
      ) : (
        <section>
          <div className="mb-6 flex items-center gap-4 max-md:flex-col max-md:items-stretch">
            {user && user.departments.length > 1 ? (
              <AppSelect
                className="w-56 max-md:w-full"
                label={text('切换部门', 'Switch department')}
                value={departmentId ?? ''}
                options={user.departments.map((department) => ({
                  value: department.id,
                  label: localizedName(department, i18n.resolvedLanguage),
                }))}
                onChange={(value) =>
                  navigate(`/departments/${value}/knowledge-bases`)
                }
              />
            ) : null}
            <label className="flex h-9 w-[360px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-slate-400 max-md:w-full">
              <Search size={15} />
              <input
                className="w-full bg-transparent text-xs outline-none"
                placeholder={text(
                  '搜索知识库名称或描述...',
                  'Search knowledge bases...',
                )}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <AppSelect
              className="w-48 max-md:w-full"
              label={text('按状态筛选', 'Filter by status')}
              showLabel
              value={statusFilter}
              options={[
                {
                  value: 'ALL',
                  label: text('全部', 'All'),
                },
                { value: 'ACTIVE', label: text('启用', 'Active') },
              ]}
              onChange={(value) => setStatusFilter(value as 'ALL' | 'ACTIVE')}
            />
            {canManage ? (
              <button
                onClick={() => {
                  setName('')
                  setDescription('')
                  setCreateOpen(true)
                }}
                className="ml-auto flex h-10 items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3.5 text-[13px] font-medium text-white max-md:ml-0"
              >
                <Plus size={14} />
                {text('新建知识库', 'New knowledge base')}
              </button>
            ) : null}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    {text('知识库', 'Knowledge base')}
                  </th>
                  <th className="px-5 py-3">{text('状态', 'Status')}</th>
                  <th className="px-5 py-3">{text('更新时间', 'Updated')}</th>
                  <th className="px-5 py-3 text-right">
                    {text('操作', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr
                    className="border-b border-slate-100 bg-white last:border-0 hover:bg-slate-50/70"
                    key={item.id}
                  >
                    <td className="px-5 py-4">
                      <button
                        className="flex min-w-0 items-center gap-3 text-left"
                        onClick={() =>
                          navigate(
                            `/departments/${departmentId}/knowledge-bases/${item.id}`,
                          )
                        }
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                          <BookOpen size={18} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-900">
                            {item.name}
                          </span>
                          <span className="mt-1 block max-w-xl truncate text-xs text-slate-500">
                            {item.description ??
                              text('暂无描述', 'No description')}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex h-6 items-center rounded-full bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700">
                        {text('启用', 'Active')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {canManage ? (
                        <button
                          type="button"
                          title={text('归档知识库', 'Archive knowledge base')}
                          aria-label={text(
                            `归档知识库 ${item.name}`,
                            `Archive knowledge base ${item.name}`,
                          )}
                          onClick={() => {
                            setArchiveTarget(item)
                            setArchiveOpen(true)
                          }}
                          className="inline-grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Archive size={16} />
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!visible.length ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-24 text-center text-sm text-slate-500"
                    >
                      {text('暂无知识库', 'No knowledge bases')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {createOpen && (
        <Modal
          title={text('新建知识库', 'New knowledge base')}
          close={() => setCreateOpen(false)}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder={text('知识库名称', 'Knowledge base name')}
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-3 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder={text('知识库描述（可选）', 'Description (optional)')}
          />
          <div className="mt-5 flex justify-end">
            <button
              onClick={() => void create()}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white"
            >
              {text('创建', 'Create')}
            </button>
          </div>
        </Modal>
      )}
      {editOpen && selected ? (
        <Modal
          title={text('编辑知识库', 'Edit knowledge base')}
          close={() => setEditOpen(false)}
        >
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder={text('知识库名称', 'Knowledge base name')}
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-3 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder={text('知识库描述（可选）', 'Description (optional)')}
          />
          <div className="mt-5 flex justify-end">
            <button
              onClick={() => void edit()}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white"
            >
              {text('保存', 'Save')}
            </button>
          </div>
        </Modal>
      ) : null}
      {archiveOpen && (
        <Modal
          title={text('归档这个知识库？', 'Archive this knowledge base?')}
          close={() => {
            setArchiveOpen(false)
            setArchiveTarget(null)
          }}
        >
          <p className="text-sm text-slate-600">
            {text(
              '归档后，文档将不再参与检索。',
              'Archived documents are excluded from retrieval.',
            )}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setArchiveOpen(false)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              {text('取消', 'Cancel')}
            </button>
            <button
              onClick={() => void archive()}
              className="rounded-md bg-rose-600 px-3 py-2 text-sm text-white"
            >
              {text('归档', 'Archive')}
            </button>
          </div>
        </Modal>
      )}
      {starterOpen && selected ? (
        <Modal
          title={text('快捷问题配置', 'Starter questions')}
          close={() => setStarterOpen(false)}
        >
          <p className="mb-4 text-xs text-slate-500">
            {text(
              '仅对当前知识库生效；清空后 Chat 不显示快捷问题。',
              'Applies only to this knowledge base. Chat shows nothing when empty.',
            )}
          </p>
          <div className="grid gap-2">
            {starterQuestions.map((question, index) => (
              <div className="flex gap-2" key={index}>
                <input
                  className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
                  maxLength={200}
                  value={question}
                  onChange={(event) =>
                    setStarterQuestions((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ),
                    )
                  }
                />
                <button
                  className="text-sm text-rose-600"
                  onClick={() =>
                    setStarterQuestions((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  {text('删除', 'Remove')}
                </button>
              </div>
            ))}
          </div>
          {starterQuestions.length < 8 ? (
            <button
              className="mt-3 text-sm text-indigo-600"
              onClick={() => setStarterQuestions((current) => [...current, ''])}
            >
              {text('+ 添加问题', '+ Add question')}
            </button>
          ) : null}
          <button
            className="mt-5 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            disabled={starterSaving}
            onClick={() => void saveStarterQuestions()}
          >
            {starterSaving ? text('保存中…', 'Saving…') : text('保存', 'Save')}
          </button>
        </Modal>
      ) : null}
    </div>
  )
}

function Detail({
  selected,
  documents,
  documentPage,
  documentTotal,
  pageSize,
  refresh,
  setDocumentPage,
  archive,
  edit,
  configureQuestions,
  canManage,
  canReview,
}: {
  selected: KnowledgeBase
  documents: KnowledgeDocument[]
  documentPage: number
  documentTotal: number
  pageSize: number
  refresh: () => Promise<void>
  setDocumentPage: (value: number | ((current: number) => number)) => void
  archive: () => void
  edit: () => void
  configureQuestions: () => void
  canManage: boolean
  canReview: boolean
}) {
  const { text } = useLocaleText()
  const documentStatusLabel = (status: string) =>
    ({
      UPLOADING: text('上传中', 'Uploading'),
      PROCESSING: text('正在解析', 'Processing'),
      PARSED: text('解析完成', 'Parsed'),
      REVIEWING: text('审核中', 'Reviewing'),
      PUBLISHED: text('已发布', 'Published'),
      FAILED: text('解析失败', 'Failed'),
      ARCHIVED: text('已归档', 'Archived'),
    })[status] ?? status
  const documentStatusClass = (status: string) =>
    ({
      UPLOADING: 'bg-sky-50 text-sky-700 ring-sky-200',
      PROCESSING: 'bg-amber-50 text-amber-700 ring-amber-200',
      PARSED: 'bg-blue-50 text-blue-700 ring-blue-200',
      REVIEWING: 'bg-violet-50 text-violet-700 ring-violet-200',
      PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      FAILED: 'bg-rose-50 text-rose-700 ring-rose-200',
      ARCHIVED: 'bg-slate-100 text-slate-600 ring-slate-200',
    })[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200'
  const input = useRef<HTMLInputElement>(null),
    [uploading, setUploading] = useState(false),
    [progress, setProgress] = useState(0),
    [archiveTarget, setArchiveTarget] = useState<KnowledgeDocument | null>(
      null,
    ),
    [markdownPreview, setMarkdownPreview] = useState<{
      name: string
      content: string
    } | null>(null)
  const upload = async (files: FileList | null) => {
    if (!files?.length || uploading) return
    setUploading(true)
    try {
      for (const file of Array.from(files))
        await uploadDocument(
          selected.id,
          file,
          { name: file.name },
          setProgress,
        )
      if (documentPage === 1) await refresh()
      else setDocumentPage(1)
    } catch {
      // The API client displays the localized HeroUI toast.
    } finally {
      setUploading(false)
      setProgress(0)
      if (input.current) input.current.value = ''
    }
  }
  const remove = async (doc: KnowledgeDocument) => {
    try {
      await archiveDocument(doc.id)
      setArchiveTarget(null)
      await refresh()
    } catch {
      // The API client displays the localized HeroUI toast.
    }
  }
  const retry = async (doc: KnowledgeDocument) => {
    try {
      await reprocessDocument(doc.id)
      await refresh()
    } catch {
      // The API client displays the localized HeroUI toast.
    }
  }
  const preview = async (doc: KnowledgeDocument) => {
    const isMarkdown =
      doc.mimeType === 'text/markdown' || doc.name.toLowerCase().endsWith('.md')
    if (isMarkdown) {
      try {
        const result = await getDocumentPreviewContent(doc.id)
        setMarkdownPreview({ name: doc.name, content: result.content })
      } catch {
        // The API client displays the localized HeroUI toast.
      }
      return
    }

    const previewWindow = window.open('about:blank', '_blank')
    if (!previewWindow) {
      toast.warning(
        text(
          '浏览器阻止了预览窗口，请允许本站打开新窗口。',
          'The browser blocked the preview window. Please allow pop-ups for this site.',
        ),
      )
      return
    }
    previewWindow.opener = null

    try {
      const blob =
        doc.mimeType === 'application/pdf'
          ? await getDocumentPreview(doc.id)
          : await getDocumentPreviewContent(doc.id).then((result) => {
              if (result.type !== 'html')
                throw new Error('Unsupported document preview')
              return new Blob(
                [
                  '<!doctype html><html><head><meta charset="utf-8">',
                  '<meta name="viewport" content="width=device-width,initial-scale=1">',
                  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: blob:; style-src \'unsafe-inline\'">',
                  '<style>body{max-width:960px;margin:0 auto;padding:40px;font:16px/1.75 system-ui;color:#1e293b}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:8px}</style>',
                  `</head><body>${result.content}</body></html>`,
                ],
                { type: 'text/html;charset=utf-8' },
              )
            })
      const url = URL.createObjectURL(blob)
      previewWindow.location.href = url
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      previewWindow.close()
    }
  }
  const totalPages = Math.max(1, Math.ceil(documentTotal / pageSize))
  const firstItem = documentTotal === 0 ? 0 : (documentPage - 1) * pageSize + 1
  const lastItem = Math.min(documentTotal, documentPage * pageSize)
  return (
    <section className="grid gap-6">
      {canManage ? (
        <div className="flex items-center justify-end gap-4">
          <Link
            className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-800"
            to={`/departments/${selected.departmentId}/knowledge-bases/${selected.id}/retrieval-debug`}
          >
            {text('检索诊断', 'Retrieval diagnostics')}
          </Link>
          <button
            onClick={configureQuestions}
            className="text-sm text-indigo-600"
          >
            {text('快捷问题', 'Starter questions')}
          </button>
          <button onClick={edit} className="text-sm text-indigo-600">
            {text('编辑知识库', 'Edit knowledge base')}
          </button>
          <button
            onClick={archive}
            className="flex items-center gap-1 text-sm text-rose-600"
          >
            <Archive size={15} />
            {text('归档知识库', 'Archive knowledge base')}
          </button>
        </div>
      ) : null}
      <article className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">{selected.name}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {text(
            '上传文件后将自动解析、分段并建立检索索引。',
            'Uploaded files are parsed, chunked, and indexed automatically.',
          )}
        </p>
      </article>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <header className="flex justify-between gap-4 border-b border-slate-200 p-5 max-sm:flex-col">
          <div>
            <h2 className="font-semibold">{text('文档管理', 'Documents')}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {text(
                '支持 PDF、DOCX 和 Markdown。',
                'Supports PDF, DOCX, and Markdown.',
              )}
            </p>
          </div>
          {canManage ? (
            <>
              <input
                ref={input}
                className="hidden"
                type="file"
                accept=".pdf,.docx,.md"
                multiple
                onChange={(e) => void upload(e.target.files)}
              />
              <button
                disabled={uploading}
                onClick={() => input.current?.click()}
                className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                {uploading ? (
                  <LoaderCircle className="animate-spin" size={15} />
                ) : (
                  <Upload size={15} />
                )}{' '}
                {uploading
                  ? text(`上传 ${progress}%`, `Uploading ${progress}%`)
                  : text('上传文档', 'Upload document')}
              </button>
            </>
          ) : null}
        </header>
        {documents.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{text('文档', 'Document')}</th>
                    <th className="px-5 py-3">{text('状态', 'Status')}</th>
                    <th className="px-5 py-3">{text('大小', 'Size')}</th>
                    <th className="px-5 py-3 text-right">
                      {text('操作', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      className="border-b border-slate-100 bg-white last:border-0 hover:bg-slate-50/70"
                      key={doc.id}
                    >
                      <td className="px-5 py-4">
                        <span className="flex min-w-0 items-center gap-3">
                          <FileText
                            className="shrink-0 text-indigo-600"
                            size={18}
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-800">
                              {doc.name}
                            </span>
                            <span className="mt-1 block truncate text-xs text-slate-400">
                              {doc.mimeType}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${documentStatusClass(doc.status)}`}
                        >
                          {documentStatusLabel(doc.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {doc.size ? `${Math.ceil(doc.size / 1024)} KB` : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            aria-label={text('预览文档', 'Preview document')}
                            title={text('预览文档', 'Preview document')}
                            onClick={() => void preview(doc)}
                            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          >
                            <Eye size={16} />
                          </button>
                          {canReview &&
                          ['PARSED', 'REVIEWING'].includes(doc.status) ? (
                            <Link
                              aria-label={text('审核文档', 'Review document')}
                              title={
                                doc.status === 'REVIEWING'
                                  ? text('继续审核', 'Continue review')
                                  : text('开始审核', 'Start review')
                              }
                              to={`/documents/${doc.id}?departmentId=${encodeURIComponent(selected.departmentId)}&knowledgeBaseId=${encodeURIComponent(selected.id)}&from=knowledge`}
                              className="grid h-8 w-8 place-items-center rounded-md text-indigo-600 hover:bg-indigo-50"
                            >
                              <FileSearch size={16} />
                            </Link>
                          ) : null}
                          {canManage && doc.status === 'FAILED' ? (
                            <button
                              title={text('重新解析', 'Retry processing')}
                              onClick={() => void retry(doc)}
                              className="grid h-8 w-8 place-items-center rounded-md text-amber-600 hover:bg-amber-50"
                            >
                              <RefreshCw size={16} />
                            </button>
                          ) : null}
                          <button
                            title={text('下载原文件', 'Download source')}
                            onClick={() =>
                              void downloadDocument(doc.id, doc.name)
                            }
                            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          >
                            <Download size={16} />
                          </button>
                          {canManage ? (
                            <button
                              title={text('删除文档', 'Delete document')}
                              onClick={() => setArchiveTarget(doc)}
                              className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 max-sm:flex-col">
              <span>
                {text(
                  `第 ${firstItem}-${lastItem} 条，共 ${documentTotal} 条`,
                  `${firstItem}-${lastItem} of ${documentTotal}`,
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={documentPage <= 1}
                  onClick={() => setDocumentPage((page) => page - 1)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {text('上一页', 'Previous')}
                </button>
                <span>
                  {documentPage} / {totalPages}
                </span>
                <button
                  disabled={documentPage >= totalPages}
                  onClick={() => setDocumentPage((page) => page + 1)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {text('下一页', 'Next')}
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="p-12 text-center text-sm text-slate-500">
            {text(
              '还没有文档，上传文件开始解析。',
              'No documents yet. Upload a file to begin processing.',
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title={text('删除文档？', 'Delete document?')}
        description={text(
          `确认删除「${archiveTarget?.name ?? ''}」？删除后不会再参与检索。`,
          `Delete “${archiveTarget?.name ?? ''}”? It will no longer be used for retrieval.`,
        )}
        confirmLabel={text('确认删除', 'Delete')}
        cancelLabel={text('取消', 'Cancel')}
        destructive
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) void remove(archiveTarget)
        }}
      />
      {markdownPreview ? (
        <Modal
          wide
          title={markdownPreview.name}
          close={() => setMarkdownPreview(null)}
        >
          <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-5 font-sans text-sm leading-7 text-slate-700">
            {markdownPreview.content}
          </pre>
        </Modal>
      ) : null}
    </section>
  )
}

function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string
  close: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/20 p-4">
      <section
        className={`w-full rounded-xl bg-white p-6 shadow-xl ${wide ? 'max-w-4xl' : 'max-w-md'}`}
      >
        <header className="mb-5 flex justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={close}>
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
