import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmbeddingProvider } from './embedding-provider.interface';
import type { EmbeddingResult } from '../types/embedding.types';

interface OpenRouterEmbeddingResponse {
  data: Array<{
    object: 'embedding';
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage?: {
    prompt_tokens?: number;
    total_tokens?: number;
  };
}

@Injectable()
export class OpenRouterEmbeddingProvider implements EmbeddingProvider {
  private readonly apiUrl: string;

  private readonly model: string;

  private readonly dimensions: number;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.getOrThrow<string>('OPENROUTER_BASE_URL');
    this.model = this.configService.getOrThrow<string>('EMBEDDING_MODEL');

    const dimensions = Number(
      this.configService.getOrThrow<string>('OPENROUTER_EMBEDDING_DIMENSIONS'),
    );

    if (!Number.isInteger(dimensions) || dimensions <= 0) {
      throw new Error(
        'OPENROUTER_EMBEDDING_DIMENSIONS must be a positive integer',
      );
    }

    this.dimensions = dimensions;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const embeddings = await this.embedMany([text]);

    const embedding = embeddings[0];

    if (!embedding) {
      throw new Error('OpenRouter returned no embedding');
    }

    return embedding;
  }

  async embedMany(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) {
      return [];
    }

    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const response = await fetch(`${this.apiUrl}/embeddings`, {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const body = await response.text();

      if (response.status === 429) {
        throw new HttpException(
          {
            message: 'Embedding provider rate limit exceeded',
            provider: 'openrouter',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadGatewayException(
        `OpenRouter embedding request failed: ${response.status}`,
      );
    }

    const result = (await response.json()) as OpenRouterEmbeddingResponse;

    if (!Array.isArray(result.data)) {
      throw new Error('Invalid OpenRouter embedding response');
    }

    /*
     * 不要单纯相信 API 返回顺序。
     * 根据 index 恢复 input 顺序。
     */
    const sorted = [...result.data].sort((a, b) => a.index - b.index);

    const embeddings = sorted.map((item) => item.embedding);

    if (embeddings.length !== texts.length) {
      throw new Error(
        `Embedding count mismatch: expected ${texts.length}, received ${embeddings.length}`,
      );
    }

    for (const embedding of embeddings) {
      if (embedding.length !== this.dimensions) {
        throw new Error(
          `Embedding dimension mismatch: expected ${this.dimensions}, received ${embedding.length}`,
        );
      }
    }

    return embeddings.map((vector) => ({
      vector,
      dimensions: this.dimensions,
      model: result.model || this.model,
    }));
  }

  getModel(): string {
    return this.model;
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
