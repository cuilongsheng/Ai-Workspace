import type { SimilarChunk } from '../../embeddings/vector-store.service';

export interface RetrievalContext {
  organizationId: string;
  departmentId: string;
  knowledgeBaseId: string;
}

export interface RetrievalOptions {
  limit?: number;
  minSimilarity?: number;
  minRerankScore?: number;
}

export type RetrievalStatus =
  | 'grounded'
  | 'no_match'
  | 'retrieval_unavailable'
  | 'needs_clarification'
  | 'partial';

export interface RetrievalDiagnostics {
  status: RetrievalStatus;
  originalQuery: string;
  semanticQueries: string[];
  lexicalQueries: string[];
  corrections: string[];
  aliases: string[];
  vectorStatus: 'ok' | 'partial' | 'failed';
  keywordStatus: 'ok' | 'partial' | 'failed';
  rerankerStatus: 'ok' | 'skipped_exact' | 'fallback' | 'not_run';
  degraded: boolean;
  candidateCounts: {
    vector: number;
    keyword: number;
    fused: number;
    final: number;
  };
  thresholds: {
    minSimilarity: number;
    minRerankScore: number;
  };
  timingsMs: Record<string, number>;
  errors: string[];
  sections: Array<{
    documentId: string;
    documentName: string;
    sectionIndex: number;
    sectionTitle: string | null;
    similarity: number;
    rerankScore: number | null;
  }>;
}

export interface RetrievalOutcome {
  status: RetrievalStatus;
  results: RetrievalResult[];
  diagnostics: RetrievalDiagnostics;
}

export interface KeywordSearchResult {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  chunkIndex: number;
  sectionIndex: number;
  sectionTitle: string | null;
  chunkInSection: number;
  indexVersion: number;
  content: string;
  documentName: string;
  keywordRank: number;
}

export interface RetrievalResult extends SimilarChunk {
  keywordRank?: number;
  retrievalScore: number;
  rerankScore?: number;
}
