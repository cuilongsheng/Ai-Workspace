import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EmbeddingProvider } from './embedding-provider.interface';
import { EmbeddingResult } from '../types/embedding.types';

interface OllamaEmbedResponse {
  model: string;
  embeddings: number[][];
}

@Injectable()
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly dimensions: number;

  private readonly timeoutMs = 30_000;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>('OLLAMA_BASE_URL');

    this.model = this.configService.getOrThrow<string>('EMBEDDING_MODEL');

    this.dimensions = Number(
      this.configService.getOrThrow<string>('EMBEDDING_DIMENSIONS'),
    );

    if (!Number.isInteger(this.dimensions) || this.dimensions <= 0) {
      throw new Error('Invalid EMBEDDING_DIMENSIONS');
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const results = await this.embedMany([text]);

    const result = results[0];

    if (!result) {
      throw new BadGatewayException('Ollama returned no embedding');
    }

    return result;
  }

  async embedMany(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) {
      return [];
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),

        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();

        throw new BadGatewayException(
          `Ollama embedding request failed: ${response.status} ${body}`,
        );
      }

      const data = (await response.json()) as OllamaEmbedResponse;

      if (!Array.isArray(data.embeddings)) {
        throw new BadGatewayException('Invalid Ollama embedding response');
      }

      if (data.embeddings.length !== texts.length) {
        throw new BadGatewayException(
          `Embedding count mismatch: expected ${texts.length}, received ${data.embeddings.length}`,
        );
      }

      return data.embeddings.map((vector) => {
        if (vector.length !== this.dimensions) {
          throw new BadGatewayException(
            `Embedding dimension mismatch: expected ${this.dimensions}, received ${vector.length}`,
          );
        }

        return {
          vector,
          dimensions: vector.length,
          model: data.model ?? this.model,
        };
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException('Ollama embedding request timed out');
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  getModel(): string {
    return this.model;
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
