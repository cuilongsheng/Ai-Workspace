import { Injectable } from '@nestjs/common';

import type { SimilarChunk } from 'src/embeddings/vector-store.service';

@Injectable()
export class ContextBuilderService {
  build(chunks: SimilarChunk[]): string {
    return chunks
      .map((chunk, index) => {
        const sourceNumber = index + 1;

        return [
          `[SOURCE ${sourceNumber}]`,
          `document: ${chunk.documentName}`,
          `chunkIndex: ${chunk.chunkIndex}`,
          '',
          chunk.content,
        ].join('\n');
      })
      .join('\n\n---\n\n');
  }
}
