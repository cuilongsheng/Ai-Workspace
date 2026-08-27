import { Module } from '@nestjs/common';

import { EmbeddingsService } from './embeddings.service';
import { EMBEDDING_PROVIDER } from './embedding.constants';
// import { OpenRouterEmbeddingProvider } from "./providers/openrouter-embedding.provider";
import { VectorStoreService } from './vector-store.service';
import { OllamaEmbeddingProvider } from './providers/ollama-embedding.provider';
import { EmbeddingsController } from './embeddings.controller';

@Module({
  controllers: [EmbeddingsController],
  providers: [
    EmbeddingsService,
    // OpenRouterEmbeddingProvider,
    OllamaEmbeddingProvider,
    VectorStoreService,
    {
      provide: EMBEDDING_PROVIDER,
      // useExisting: OpenRouterEmbeddingProvider,
      useExisting: OllamaEmbeddingProvider,
    },
  ],

  exports: [EmbeddingsService, VectorStoreService],
})
export class EmbeddingsModule {}
