export interface ChatStreamCitation {
  sourceNumber: number;

  documentId: string;

  documentChunkId: string;

  documentName: string;

  chunkIndex: number;

  quote: string;

  similarity: number;

  retrievalScore: number;

  rerankScore: number | null;
}

export type ChatStreamEvent =
  | {
      type: 'start';

      messageId: string;
    }
  | {
      type: 'delta';

      content: string;
    }
  | {
      type: 'citations';

      citations: ChatStreamCitation[];
    }
  | {
      type: 'retrieval';

      status:
        | 'not_ready'
        | 'no_match'
        | 'retrieval_unavailable'
        | 'needs_clarification'
        | 'partial'
        | 'grounded';

      message?: string;

      suggestions?: string[];
    }
  | {
      type: 'done';

      messageId: string;
    }
  | {
      type: 'error';

      message: string;
    };
