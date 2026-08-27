import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';

import { LLM_PROVIDER, System_Prompt } from './ai.constants';

import { ContextBuilderService } from './context-builder.service';

import type {
  LlmMessage,
  LlmProvider,
  LlmStreamChunk,
} from './providers/llm-provider.interface';

import { RetrievalService } from 'src/retrieval/retrieval.service';

import type { RetrievalResult } from 'src/retrieval/types/retrieval.types';

import type { QueryRewriteHistoryMessage } from 'src/retrieval/query-rewrite.service';
import type {
  RetrievalDiagnostics,
  RetrievalStatus,
} from 'src/retrieval/types/retrieval.types';

export interface RagPreparedContext {
  status: RetrievalStatus;

  messages: LlmMessage[];

  /**
   * Retrieval Top K。
   *
   * 最终用于 Citation。
   */
  chunks: RetrievalResult[];

  diagnostics: RetrievalDiagnostics;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly retrievalService: RetrievalService,

    private readonly contextBuilder: ContextBuilderService,

    @Inject(LLM_PROVIDER)
    private readonly llmProvider: LlmProvider,
  ) {}

  /**
   * ============================================================
   * Prepare RAG
   * ============================================================
   *
   * Question
   *   ↓
   * Query Rewrite
   *   ↓
   * Vector + BM25
   *   ↓
   * RRF
   *   ↓
   * Reranker
   *   ↓
   * Top K
   *   ↓
   * Context Builder
   *
   * 这里还没有开始最终回答。
   */
  async prepareRag(
    question: string,

    context: {
      organizationId: string;
      departmentId: string;
      knowledgeBaseId: string;
    },

    history: QueryRewriteHistoryMessage[] = [],
  ): Promise<RagPreparedContext> {
    const normalizedQuestion = question.trim();

    if (!normalizedQuestion) {
      throw new BadRequestException('Question cannot be empty');
    }

    const start = performance.now();

    const retrievalStart = performance.now();

    const retrieval = await this.retrievalService.searchDetailed(
      normalizedQuestion,

      context,

      {
        limit: 5,
      },

      history,
    );

    const chunks = retrieval.results;
    this.logger.debug(`Retrieval results: ${chunks.length}`);

    this.logger.debug(
      `Retrieval: ${Math.round(performance.now() - retrievalStart)}ms`,
    );

    /**
     * 没找到任何资料。
     *
     * 依然可以让 LLM 按 System Prompt
     * 返回固定的“知识库无法确定”。
     */
    if (!['grounded', 'partial'].includes(retrieval.status)) {
      return {
        status: retrieval.status,
        messages: [],
        chunks,
        diagnostics: retrieval.diagnostics,
      };
    }

    /**
     * Retrieval Result
     *
     * ↓
     *
     * [SOURCE 1]
     * ...
     *
     * [SOURCE 2]
     * ...
     */
    const ragContext = this.contextBuilder.build(chunks);

    const generationHistory: LlmMessage[] = history
      .slice(-6)
      .map((message) => ({
        role: message.role === 'USER' ? 'user' : 'assistant',
        // 历史 Citation 编号只属于当时的上下文，不能污染本轮 SOURCE 编号。
        content: message.content.replace(/\[\d+\]/g, ''),
      }));

    const messages: LlmMessage[] = [
      {
        role: 'system',

        content: System_Prompt,
      },

      ...generationHistory,

      {
        role: 'user',

        content: [
          'CONTEXT:',
          '',
          ragContext,
          '',
          'QUESTION:',
          '',
          normalizedQuestion,
        ].join('\n'),
      },
    ];

    this.logger.debug(
      `RAG prepared in ${Math.round(performance.now() - start)}ms`,
    );

    return {
      status: 'grounded',
      messages,
      chunks,
      diagnostics: retrieval.diagnostics,
    };
  }

  /**
   * ============================================================
   * Final LLM Streaming
   * ============================================================
   */
  async *streamPreparedRag(
    prepared: RagPreparedContext,
  ): AsyncGenerator<LlmStreamChunk> {
    const start = performance.now();

    let contentLength = 0;

    try {
      for await (const chunk of this.llmProvider.stream(
        prepared.messages,

        {
          thinking: false,

          responseFormat: 'text',

          maxTokens: 1200,
        },
      )) {
        contentLength += chunk.content.length;

        yield chunk;
      }

      this.logger.debug(
        [
          `LLM stream: ${Math.round(performance.now() - start)}ms`,

          `Content length: ${contentLength}`,
        ].join('\n'),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(`LLM stream failed: ${message}`);

      throw error;
    }
  }

  /**
   * ============================================================
   * Citation Builder
   * ============================================================
   *
   * Answer:
   *
   * 河南农业大学……[1]
   *
   * ↓
   *
   * [1]
   *
   * ↓
   *
   * chunks[0]
   */
  buildCitations(chunks: RetrievalResult[], answer: string) {
    const extracted = this.extractUsedSourceNumbers(answer).filter(
      (sourceNumber) => sourceNumber <= chunks.length,
    );
    // Citation UI is an independent source contract. If the model forgets
    // inline [n] markers, keep the grounded sources instead of returning 0.
    const sourceNumbers = extracted.length
      ? extracted
      : chunks.map((_, index) => index + 1);

    return chunks
      .map((chunk, index) => ({
        sourceNumber: index + 1,

        documentId: chunk.documentId,

        documentChunkId: chunk.id,

        documentName: chunk.documentName,

        chunkIndex: chunk.chunkIndex,

        quote: chunk.content,

        similarity: chunk.similarity,

        retrievalScore: chunk.retrievalScore,

        rerankScore: chunk.rerankScore ?? null,
      }))
      .filter((citation) => sourceNumbers.includes(citation.sourceNumber));
  }

  private extractUsedSourceNumbers(answer: string): number[] {
    return [
      ...new Set(
        [...answer.matchAll(/\[(\d+)]/g)]
          .map((match) => Number(match[1]))
          .filter(
            (sourceNumber) =>
              Number.isInteger(sourceNumber) && sourceNumber > 0,
          ),
      ),
    ];
  }
}
