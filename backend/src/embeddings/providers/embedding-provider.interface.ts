import { EmbeddingResult } from '../types/embedding.types';

export interface EmbeddingProvider {
  embed(text: string): Promise<EmbeddingResult>;

  embedMany(texts: string[]): Promise<EmbeddingResult[]>;

  getDimensions(): number;

  getModel(): string;
}
