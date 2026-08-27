export type LlmRole = 'system' | 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmGenerationOptions {
  /**
   * 是否启用 reasoning / thinking。
   *
   * Query Rewrite / RAG Answer：
   * false
   *
   * 后续 Agent：
   * 可以 true
   */
  thinking?: boolean;

  /**
   * 普通文本 or JSON。
   *
   * Query Rewrite:
   * json
   *
   * 最终 Streaming Answer:
   * text
   */
  responseFormat?: 'text' | 'json';

  maxTokens?: number;
}

export interface LlmGenerationResult {
  content: string;
  model: string;
}

export interface LlmStreamChunk {
  content: string;

  /**
   * 第一个 stream chunk 通常能拿到 model，
   * 后续 chunk 不一定有。
   */
  model?: string;
}

export interface LlmProvider {
  /**
   * 非流式生成。
   *
   * 当前主要用于：
   * Query Rewrite。
   */
  generate(
    messages: LlmMessage[],
    options?: LlmGenerationOptions,
  ): Promise<LlmGenerationResult>;

  /**
   * 流式生成。
   *
   * 当前用于：
   * 最终 RAG Answer。
   */
  stream(
    messages: LlmMessage[],
    options?: LlmGenerationOptions,
  ): AsyncGenerator<LlmStreamChunk>;
}
