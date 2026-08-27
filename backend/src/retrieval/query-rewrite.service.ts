import { Inject, Injectable, Logger } from '@nestjs/common';

import { LLM_PROVIDER } from 'src/ai/ai.constants';
import type { LlmProvider } from 'src/ai/providers/llm-provider.interface';

import type {
  QueryRewriteOutput,
  RewrittenQuery,
} from './types/query-rewrite.types';

export interface QueryRewriteHistoryMessage {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

@Injectable()
export class QueryRewriteService {
  private readonly logger = new Logger(QueryRewriteService.name);

  constructor(
    @Inject(LLM_PROVIDER)
    private readonly llmProvider: LlmProvider,
  ) {}

  async rewrite(
    query: string,
    history: QueryRewriteHistoryMessage[] = [],
  ): Promise<RewrittenQuery> {
    const originalQuery = query.trim();

    if (!originalQuery) {
      return {
        originalQuery: '',
        semanticQuery: '',
        lexicalQuery: '',
        semanticQueries: [],
        lexicalQueries: [],
        corrections: [],
        aliases: [],
      };
    }

    const start = performance.now();

    try {
      const completion = await this.llmProvider.generate(
        [
          {
            role: 'system',
            content: QUERY_REWRITE_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: this.buildPrompt(originalQuery, history),
          },
        ],
        {
          thinking: false,
          responseFormat: 'json',
          maxTokens: 300,
        },
      );

      const parsed = this.parseRewriteResponse(completion.content);

      const semanticQuery = parsed?.semanticQuery?.trim() || originalQuery;

      const lexicalQuery = parsed?.lexicalQuery?.trim() || semanticQuery;
      const corrections = this.normalizeTerms(parsed?.corrections);
      const aliases = this.normalizeTerms(parsed?.aliases);
      const semanticQueries = this.unique([
        originalQuery,
        semanticQuery,
        ...corrections,
        ...aliases,
      ]);
      const lexicalQueries = this.unique([
        lexicalQuery,
        originalQuery,
        ...corrections,
        ...aliases,
      ]);

      const result: RewrittenQuery = {
        originalQuery,
        semanticQuery,
        lexicalQuery,
        semanticQueries,
        lexicalQueries,
        corrections,
        aliases,
      };

      this.logger.debug(
        [
          `Query rewrite completed in ${Math.round(
            performance.now() - start,
          )}ms`,
          `Original: ${result.originalQuery}`,
          `Semantic: ${result.semanticQuery}`,
          `Lexical: ${result.lexicalQuery}`,
        ].join('\n'),
      );

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `Query rewrite failed, fallback to original query: ${message}`,
      );

      return {
        originalQuery,
        semanticQuery: originalQuery,
        lexicalQuery: originalQuery,
        semanticQueries: [originalQuery],
        lexicalQueries: [originalQuery],
        corrections: [],
        aliases: [],
      };
    }
  }

  private buildPrompt(query: string, history: QueryRewriteHistoryMessage[]) {
    const recentHistory = history
      .slice(-10)
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');

    return [
      'CONVERSATION HISTORY:',
      recentHistory || '(empty)',
      '',
      'CURRENT QUESTION:',
      query,
    ].join('\n');
  }

  private parseRewriteResponse(content: string): QueryRewriteOutput | null {
    try {
      const normalized = this.removeMarkdownCodeFence(content);

      const parsed = JSON.parse(normalized) as QueryRewriteOutput;

      if (
        typeof parsed.semanticQuery !== 'string' ||
        typeof parsed.lexicalQuery !== 'string'
      ) {
        return null;
      }

      return parsed;
    } catch {
      this.logger.warn(`Invalid query rewrite response: ${content}`);

      return null;
    }
  }

  private removeMarkdownCodeFence(content: string) {
    return content
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }

  private normalizeTerms(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  private unique(values: string[]) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }
}

const QUERY_REWRITE_SYSTEM_PROMPT = `
You are the query understanding component of an enterprise RAG system.

You receive:

1. Recent conversation history.
2. The user's current question.

Your job is to produce:

- semanticQuery:
  A complete standalone natural-language question suitable for semantic/vector retrieval.

- lexicalQuery:
  A concise keyword-oriented query suitable for BM25 retrieval.

- corrections:
  Corrected query/entity variants only when the input likely contains a typo.

- aliases:
  Common full-name, abbreviation or old-name variants that are strongly implied.

IMPORTANT:

The current question may depend on previous conversation context.

Resolve pronouns, omissions and implicit references when the conversation makes them clear.

Examples:

History:
USER: 河南农业大学计算机专业最低录取分数是多少？
ASSISTANT: 最低分为588、568、562。

Current:
那软件工程呢？

Output:
{
  "semanticQuery": "河南农业大学软件工程最低录取分数是多少？",
  "lexicalQuery": "河南农业大学 软件工程 最低分"
}

History:
USER: 公司年假有多少天？
ASSISTANT: 正式员工每年有10天年假。

Current:
那婚假呢？

Output:
{
  "semanticQuery": "公司的婚假制度是什么？",
  "lexicalQuery": "婚假 制度"
}

If the current question is already standalone, preserve its meaning.

Do not answer the question.

Do not invent missing facts that cannot be inferred from the conversation.

Return valid JSON only.

Schema:

{
  "semanticQuery": "string",
  "lexicalQuery": "string",
  "corrections": ["string"],
  "aliases": ["string"]
}
`;
