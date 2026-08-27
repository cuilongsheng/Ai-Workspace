import { SimilarChunk } from 'src/embeddings/vector-store.service';
import { LlmMessage } from '../providers/llm-provider.interface';

export interface RagCitation {
  sourceNumber: number;

  chunkId: string;
  documentId: string;
  documentName: string;

  chunkIndex: number;

  quote: string;

  similarity: number;
}

export interface RagStreamResult {
  content: string;
  model?: string;
}

export interface RagPreparedContext {
  messages: LlmMessage[];
  chunks: SimilarChunk[];
}
