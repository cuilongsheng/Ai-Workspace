import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import type {
  LlmGenerationOptions,
  LlmGenerationResult,
  LlmMessage,
  LlmProvider,
  LlmStreamChunk,
} from './llm-provider.interface';

interface DeepSeekResponse {
  model?: string;

  choices?: Array<{
    finish_reason?: string | null;

    message?: {
      role?: string;
      content?: string | null;
      reasoning_content?: string | null;
    };
  }>;

  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;

    prompt_tokens_details?: {
      cached_tokens?: number;
    };

    completion_tokens_details?: {
      reasoning_tokens?: number;
    };

    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
  };
}

interface DeepSeekStreamResponse {
  model?: string;

  choices?: Array<{
    finish_reason?: string | null;

    delta?: {
      role?: string;
      content?: string | null;
      reasoning_content?: string | null;
    };
  }>;
}

@Injectable()
export class DeepSeekLlmProvider implements LlmProvider {
  private readonly apiKey: string;

  private readonly baseUrl: string;

  private readonly model: string;

  /**
   * 普通 request。
   */
  private readonly timeoutMs = 30_000;

  /**
   * Streaming v1.0。
   *
   * 当前按整个请求 60 秒控制。
   * 后续 2.0 再拆 connect timeout / idle timeout。
   */
  private readonly streamTimeoutMs = 60_000;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('DEEPSEEK_API_KEY');

    this.baseUrl = this.configService.getOrThrow<string>('DEEPSEEK_BASE_URL');

    this.model = this.configService.getOrThrow<string>('DEEPSEEK_MODEL');
  }

  /**
   * ============================================================
   * Non Streaming
   * ============================================================
   *
   * 当前：
   * QueryRewriteService 使用。
   */
  async generate(
    messages: LlmMessage[],
    options: LlmGenerationOptions = {},
  ): Promise<LlmGenerationResult> {
    const data = await this.request(messages, options);

    const choice = data.choices?.[0];

    const content = choice?.message?.content;

    if (typeof content !== 'string' || !content.trim()) {
      throw new BadGatewayException(
        [
          'DeepSeek returned empty content.',
          `finish_reason=${choice?.finish_reason ?? 'unknown'}`,
        ].join(' '),
      );
    }

    return {
      content,
      model: data.model ?? this.model,
    };
  }

  /**
   * ============================================================
   * Streaming
   * ============================================================
   *
   * DeepSeek SSE
   *
   * data: {...}
   * data: {...}
   * data: [DONE]
   *
   * ↓
   *
   * AsyncGenerator
   */
  async *stream(
    messages: LlmMessage[],
    options: LlmGenerationOptions = {},
  ): AsyncGenerator<LlmStreamChunk> {
    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), this.streamTimeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${this.apiKey}`,

          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          model: this.model,

          messages,

          stream: true,

          /**
           * RAG Answer 不需要 reasoning。
           */
          thinking: {
            type: options.thinking === true ? 'enabled' : 'disabled',
          },

          max_tokens: options.maxTokens ?? 1200,

          /**
           * thinking 关闭时才设置。
           */
          ...(options.thinking !== true
            ? {
                temperature: 0.1,
              }
            : {}),
        }),

        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();

        throw new BadGatewayException(
          `DeepSeek stream request failed: ${response.status} ${body}`,
        );
      }

      if (!response.body) {
        throw new BadGatewayException('DeepSeek stream response body is empty');
      }

      const reader = response.body.getReader();

      const decoder = new TextDecoder();

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, {
          stream: true,
        });

        /**
         * 一个 HTTP chunk
         * 可能包含多个 SSE line，
         *
         * 也可能只包含半条。
         */
        const lines = buffer.split('\n');

        /**
         * 最后一段可能不完整，
         * 留给下一次 reader.read()。
         */
        buffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          const line = rawLine.trim();

          if (!line.startsWith('data:')) {
            continue;
          }

          const data = line.slice(5).trim();

          if (!data) {
            continue;
          }

          if (data === '[DONE]') {
            return;
          }

          let payload: DeepSeekStreamResponse;

          try {
            payload = JSON.parse(data) as DeepSeekStreamResponse;
          } catch {
            /**
             * 单个 frame 异常
             * 不直接炸整个 stream。
             */
            continue;
          }

          const delta = payload.choices?.[0]?.delta?.content;

          /**
           * reasoning_content 不向用户输出。
           */
          if (typeof delta !== 'string' || !delta) {
            continue;
          }

          yield {
            content: delta,

            model: payload.model ?? this.model,
          };
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException(
          'DeepSeek streaming request timed out',
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * ============================================================
   * Normal Request
   * ============================================================
   */
  private async request(
    messages: LlmMessage[],
    options: LlmGenerationOptions,
  ): Promise<DeepSeekResponse> {
    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${this.apiKey}`,

          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          model: this.model,

          messages,

          thinking: {
            type: options.thinking === true ? 'enabled' : 'disabled',
          },

          max_tokens: options.maxTokens ?? 800,

          ...(options.thinking !== true
            ? {
                temperature: 0.1,
              }
            : {}),

          ...(options.responseFormat === 'json'
            ? {
                response_format: {
                  type: 'json_object',
                },
              }
            : {}),
        }),

        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();

        throw new BadGatewayException(
          `DeepSeek request failed: ${response.status} ${body}`,
        );
      }

      return (await response.json()) as DeepSeekResponse;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException('DeepSeek request timed out');
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
