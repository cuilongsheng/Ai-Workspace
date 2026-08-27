import { apiClient } from './client'
import type { RetrievalStatus } from './chat'

export type RetrievalDiagnostics = {
  status: RetrievalStatus
  originalQuery: string
  semanticQueries: string[]
  lexicalQueries: string[]
  corrections: string[]
  aliases: string[]
  vectorStatus: 'ok' | 'partial' | 'failed'
  keywordStatus: 'ok' | 'partial' | 'failed'
  rerankerStatus: 'ok' | 'skipped_exact' | 'fallback' | 'not_run'
  degraded: boolean
  candidateCounts: Record<'vector' | 'keyword' | 'fused' | 'final', number>
  thresholds: { minSimilarity: number; minRerankScore: number }
  timingsMs: Record<string, number>
  errors: string[]
  sections: Array<{
    documentId: string
    documentName: string
    sectionIndex: number
    sectionTitle: string | null
    similarity: number
    rerankScore: number | null
  }>
}

export async function debugRetrieval(
  departmentId: string,
  knowledgeBaseId: string,
  query: string,
) {
  return (
    await apiClient.post<{
      status: RetrievalStatus
      diagnostics: RetrievalDiagnostics | null
    }>(
      `/departments/${departmentId}/knowledge-bases/${knowledgeBaseId}/retrieval-debug`,
      { query },
    )
  ).data
}
