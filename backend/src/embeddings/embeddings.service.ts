import { Inject, Injectable } from '@nestjs/common';

import { EMBEDDING_PROVIDER } from './embedding.constants';

import type { EmbeddingProvider } from './providers/embedding-provider.interface';

@Injectable()
export class EmbeddingsService {
  constructor(
    @Inject(EMBEDDING_PROVIDER)
    private readonly provider: EmbeddingProvider,
  ) {}

  embed(text: string) {
    return this.provider.embed(text);
  }

  embedMany(texts: string[]) {
    return this.provider.embedMany(texts);
  }

  getModel() {
    return this.provider.getModel();
  }

  getDimensions() {
    return this.provider.getDimensions();
  }
}
