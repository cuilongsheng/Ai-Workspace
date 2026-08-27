import type { RetrievalResult } from '../types/retrieval.types';

export interface RerankResult extends RetrievalResult {
  rerankScore: number;
}

export interface Reranker {
  rerank(
    query: string,
    candidates: RetrievalResult[],
    limit: number,
  ): Promise<RerankResult[]>;
}
