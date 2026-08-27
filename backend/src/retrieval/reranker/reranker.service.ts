import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RerankApiResponse, RerankRequest } from './types/reranker.type';
import type { RetrievalResult } from '../types/retrieval.types';

export interface RerankedResult extends RetrievalResult {
  rerankScore: number;
}

@Injectable()
export class RerankerService {
  private readonly logger = new Logger(RerankerService.name);

  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('RERANKER_BASE_URL') ??
      'http://127.0.0.1:8010';

    this.timeoutMs =
      this.configService.get<number>('RERANKER_TIMEOUT_MS') ?? 10_000;
  }

  async rerank(
    query: string,
    candidates: RetrievalResult[],
    limit: number,
  ): Promise<RerankedResult[]> {
    if (!query.trim() || candidates.length === 0) {
      return [];
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    const start = performance.now();

    try {
      const payload: RerankRequest = {
        query,

        top_k: Math.min(limit, candidates.length),

        documents: candidates.map((candidate) => ({
          id: candidate.id,
          content: this.buildRerankContent(candidate.content),
        })),
      };

      const response = await fetch(`${this.baseUrl}/rerank`, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify(payload),

        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();

        throw new BadGatewayException(
          `Reranker request failed: ${response.status} ${body}`,
        );
      }

      const data = (await response.json()) as RerankApiResponse;

      if (!Array.isArray(data.results)) {
        throw new BadGatewayException('Invalid reranker response');
      }

      /**
       * FastAPI 返回的是：
       *
       * [
       *   { id, score },
       *   ...
       * ]
       *
       * 所以需要重新映射回原 RetrievalResult。
       */
      const candidateMap = new Map(
        candidates.map((candidate) => [candidate.id, candidate]),
      );

      const results = data.results
        .map((item) => {
          const candidate = candidateMap.get(item.id);

          if (!candidate) {
            return null;
          }

          return {
            ...candidate,

            rerankScore: item.score,
          };
        })
        .filter((item): item is RerankedResult => item !== null);

      this.logger.debug(
        `Rerank completed in ${Math.round(performance.now() - start)}ms`,
      );

      return results;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException('Reranker request timed out');
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  private buildRerankContent(content: string) {
    return content.replace(/\s+/g, ' ').trim().slice(0, 500);
  }
}
