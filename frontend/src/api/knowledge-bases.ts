import { apiClient } from './client'

export type KnowledgeBase = {
  id: string
  departmentId: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'ARCHIVED'
  updatedAt: string
}

export type StarterQuestions = {
  knowledgeBaseId: string
  questions: string[]
}

export type KnowledgeBaseReadiness = {
  status: 'READY' | 'NOT_READY'
  publishedDocuments: number
  searchableChunks: number
  embeddedChunks: number
  processingDocuments: number
  failedDocuments: number
  lastIndexedAt: string | null
}

export type KnowledgeDocument = {
  id: string
  organizationId: string
  departmentId: string
  knowledgeBaseId: string
  name: string
  status: string
  updatedAt: string
  description?: string | null
  originalName?: string
  mimeType?: string
  size?: number
  createdAt?: string
}

export type DocumentChunk = {
  id: string
  documentId: string
  chunkIndex: number
  content: string
  charCount: number
  tokenCount: number | null
  metadata: Record<string, unknown> | null
  embeddingModel: string | null
  createdAt: string
  updatedAt: string
}

export type PaginatedKnowledgeDocuments = {
  items: KnowledgeDocument[]
  total: number
  pageNumber: number
  pageSize: number
}

export async function listKnowledgeBases(departmentId: string) {
  const items = (
    await apiClient.get<{ items: KnowledgeBase[] }>(
      `/departments/${departmentId}/knowledge-bases`,
    )
  ).data.items
  return items.map((item) => ({ ...item, departmentId }))
}

export async function listDocuments(
  knowledgeBaseId: string,
  pageNumber = 1,
  pageSize = 20,
): Promise<PaginatedKnowledgeDocuments> {
  const response = await apiClient.get<{
    items: KnowledgeDocument[]
    total: number
  }>(`/knowledge-bases/${knowledgeBaseId}/documents`, {
    params: { pageNumber, pageSize },
  })

  return {
    items: response.data.items,
    total: response.data.total,
    pageNumber,
    pageSize,
  }
}

export async function createKnowledgeBase(
  departmentId: string,
  input: Pick<KnowledgeBase, 'name' | 'description'>,
) {
  return (
    await apiClient.post<KnowledgeBase>(
      `/departments/${departmentId}/knowledge-bases`,
      input,
      { successToast: true },
    )
  ).data
}

export async function updateKnowledgeBase(
  departmentId: string,
  knowledgeBaseId: string,
  input: Partial<Pick<KnowledgeBase, 'name' | 'description'>>,
) {
  return (
    await apiClient.patch<KnowledgeBase>(
      `/departments/${departmentId}/knowledge-bases/${knowledgeBaseId}`,
      input,
      { successToast: true },
    )
  ).data
}

export async function archiveKnowledgeBase(
  departmentId: string,
  knowledgeBaseId: string,
) {
  return apiClient.patch(
    `/departments/${departmentId}/knowledge-bases/${knowledgeBaseId}/archive`,
    undefined,
    { successToast: true },
  )
}

export async function getKnowledgeBaseStarterQuestions(
  departmentId: string,
  knowledgeBaseId: string,
) {
  return (
    await apiClient.get<StarterQuestions>(
      `/departments/${departmentId}/knowledge-bases/${knowledgeBaseId}/starter-questions`,
    )
  ).data
}

export async function getKnowledgeBaseReadiness(
  departmentId: string,
  knowledgeBaseId: string,
) {
  return (
    await apiClient.get<KnowledgeBaseReadiness>(
      `/departments/${departmentId}/knowledge-bases/${knowledgeBaseId}/readiness`,
    )
  ).data
}

export async function updateKnowledgeBaseStarterQuestions(
  departmentId: string,
  knowledgeBaseId: string,
  questions: string[],
) {
  return (
    await apiClient.patch<StarterQuestions>(
      `/departments/${departmentId}/knowledge-bases/${knowledgeBaseId}/starter-questions`,
      { questions },
      { successToast: true },
    )
  ).data
}

export async function uploadDocument(
  knowledgeBaseId: string,
  file: File,
  input: { name: string; description?: string },
  onProgress?: (percentage: number) => void,
) {
  const body = new FormData()
  body.append('file', file)
  body.append('name', input.name)
  if (input.description) body.append('description', input.description)
  return (
    await apiClient.post<KnowledgeDocument>(
      `/knowledge-bases/${knowledgeBaseId}/documents`,
      body,
      {
        successToast: true,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total)
            onProgress?.(Math.round((event.loaded / event.total) * 100))
        },
      },
    )
  ).data
}

export async function archiveDocument(documentId: string) {
  return apiClient.delete(`/documents/${documentId}`, { successToast: true })
}

export async function reprocessDocument(documentId: string) {
  return apiClient.post(`/documents/${documentId}/reprocess`, undefined, {
    successToast: true,
  })
}

export async function getDocument(documentId: string) {
  return (await apiClient.get<KnowledgeDocument>(`/documents/${documentId}`))
    .data
}

export async function listDocumentChunks(documentId: string) {
  return (
    await apiClient.get<DocumentChunk[]>(`/documents/${documentId}/chunks`)
  ).data
}

export async function createDocumentChunk(documentId: string, content: string) {
  return (
    await apiClient.post<DocumentChunk>(
      `/documents/${documentId}/chunks`,
      { content },
      { successToast: true },
    )
  ).data
}

export async function updateDocumentChunk(chunkId: string, content: string) {
  return (
    await apiClient.patch<DocumentChunk>(
      `/document-chunks/${chunkId}`,
      { content },
      { successToast: true },
    )
  ).data
}

export async function deleteDocumentChunk(chunkId: string) {
  await apiClient.delete(`/document-chunks/${chunkId}`, { successToast: true })
}

export async function startDocumentReview(documentId: string) {
  return (
    await apiClient.post<KnowledgeDocument>(
      `/documents/${documentId}/review`,
      undefined,
      { successToast: true },
    )
  ).data
}

export async function publishDocument(documentId: string) {
  return (
    await apiClient.post<KnowledgeDocument>(
      `/documents/${documentId}/publish`,
      undefined,
      { successToast: true },
    )
  ).data
}

export async function getDocumentPreview(documentId: string) {
  return (
    await apiClient.get<Blob>(`/documents/${documentId}/preview`, {
      responseType: 'blob',
    })
  ).data
}

export async function getDocumentPreviewContent(documentId: string) {
  return (
    await apiClient.get<{
      type: 'html' | 'text' | 'unsupported'
      content: string
    }>(`/documents/${documentId}/preview-content`)
  ).data
}

export async function downloadDocument(documentId: string, filename: string) {
  const response = await apiClient.get(`/documents/${documentId}/download`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(response.data as Blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
