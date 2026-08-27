import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingsService } from 'src/embeddings/embeddings.service';
import { VectorStoreService } from 'src/embeddings/vector-store.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RerankerService } from './reranker/reranker.service';
import {
  QueryRewriteHistoryMessage,
  QueryRewriteService,
} from './query-rewrite.service';
import type {
  KeywordSearchResult,
  RetrievalContext,
  RetrievalDiagnostics,
  RetrievalOptions,
  RetrievalOutcome,
  RetrievalResult,
} from './types/retrieval.types';

export type { RetrievalResult } from './types/retrieval.types';

interface VariantRun<T> {
  results: T[][];
  status: 'ok' | 'partial' | 'failed';
  errors: string[];
}

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly prisma: PrismaService,
    private readonly queryRewriteService: QueryRewriteService,
    private readonly rerankerService: RerankerService,
    private readonly configService: ConfigService,
  ) {}

  async search(
    query: string,
    context: RetrievalContext,
    options?: RetrievalOptions,
    history: QueryRewriteHistoryMessage[] = [],
  ): Promise<RetrievalResult[]> {
    return (await this.searchDetailed(query, context, options, history))
      .results;
  }

  async searchDetailed(
    query: string,
    context: RetrievalContext,
    options?: RetrievalOptions,
    history: QueryRewriteHistoryMessage[] = [],
  ): Promise<RetrievalOutcome> {
    const startedAt = performance.now();
    const normalizedQuery = query.trim();
    const limit = options?.limit ?? 5;
    const candidateLimit = Math.max(limit * 4, 20);
    const rerankCandidateLimit = Math.min(
      candidateLimit,
      Math.max(limit * 2, 10),
    );
    const minSimilarity =
      options?.minSimilarity ??
      this.numberConfig('RETRIEVAL_MIN_SIMILARITY', 0.35);
    const minRerankScore =
      options?.minRerankScore ??
      this.numberConfig('RETRIEVAL_MIN_RERANK_SCORE', 0.15);

    if (!normalizedQuery) {
      return this.emptyOutcome(normalizedQuery, minSimilarity, minRerankScore);
    }

    const rewriteStart = performance.now();
    const rewritten = await this.queryRewriteService.rewrite(
      normalizedQuery,
      history,
    );
    const rewriteMs = performance.now() - rewriteStart;
    const semanticQueries = (
      rewritten.semanticQueries?.length
        ? rewritten.semanticQueries
        : [rewritten.semanticQuery]
    ).slice(0, 4);
    const lexicalQueries = (
      rewritten.lexicalQueries?.length
        ? rewritten.lexicalQueries
        : [rewritten.lexicalQuery]
    ).slice(0, 4);

    const retrievalStart = performance.now();
    const [vectorRun, keywordRun] = await Promise.all([
      this.runVariants(semanticQueries, async (variant) => {
        const embedding = await this.embeddingsService.embed(variant);
        return this.vectorStoreService.searchSimilarChunks(embedding.vector, {
          organizationId: context.organizationId,
          departmentId: context.departmentId,
          knowledgeBaseId: context.knowledgeBaseId,
          limit: candidateLimit,
          minSimilarity,
        });
      }),
      this.runVariants(lexicalQueries, (variant) =>
        this.keywordSearch(variant, context, candidateLimit),
      ),
    ]);
    const retrievalMs = performance.now() - retrievalStart;

    const errors = [...vectorRun.errors, ...keywordRun.errors];
    if (vectorRun.status === 'failed' && keywordRun.status === 'failed') {
      return this.outcome({
        status: 'retrieval_unavailable',
        results: [],
        rewritten,
        vectorStatus: vectorRun.status,
        keywordStatus: keywordRun.status,
        rerankerStatus: 'not_run',
        candidateCounts: { vector: 0, keyword: 0, fused: 0, final: 0 },
        minSimilarity,
        minRerankScore,
        timingsMs: {
          rewrite: rewriteMs,
          retrieval: retrievalMs,
          total: performance.now() - startedAt,
        },
        errors,
      });
    }

    const vectorResults = this.mergeVectorRankings(vectorRun.results);
    const keywordResults = this.mergeKeywordRankings(keywordRun.results);
    const normalizedVectorResults: RetrievalResult[] = vectorResults.map(
      (item) => ({ ...item, retrievalScore: 0 }),
    );
    const normalizedKeywordResults: RetrievalResult[] = keywordResults.map(
      (item) => ({
        ...item,
        similarity: 0,
        retrievalScore: 0,
      }),
    );
    const lexicalAnchors = this.findLexicalAnchors(
      normalizedKeywordResults,
      lexicalQueries.join(' '),
    );
    const hybridCandidates = this.fuseResults(
      normalizedVectorResults,
      normalizedKeywordResults,
      rerankCandidateLimit,
    );

    let finalChildren: RetrievalResult[] = [];
    let rerankerStatus: RetrievalDiagnostics['rerankerStatus'] = 'not_run';
    let rerankMs = 0;
    if (lexicalAnchors.length) {
      finalChildren = lexicalAnchors;
      rerankerStatus = 'skipped_exact';
    } else if (hybridCandidates.length) {
      const rerankStart = performance.now();
      try {
        const reranked = await this.rerankerService.rerank(
          rewritten.semanticQuery,
          hybridCandidates,
          limit,
        );
        finalChildren = reranked.filter(
          (result) => result.rerankScore >= minRerankScore,
        );
        rerankerStatus = 'ok';
      } catch (error) {
        errors.push(this.errorMessage('reranker', error));
        finalChildren = hybridCandidates
          .filter(
            (result) =>
              result.similarity >= minSimilarity ||
              (result.keywordRank ?? 0) > 0,
          )
          .slice(0, limit);
        rerankerStatus = 'fallback';
      } finally {
        rerankMs = performance.now() - rerankStart;
      }
    }

    const parents = await this.restoreParentSections(
      finalChildren,
      lexicalAnchors,
      context,
      limit,
    );
    const needsClarification =
      normalizedQuery.length <= 3 &&
      lexicalAnchors.length === 0 &&
      parents.length > 1;
    const partial = this.isPartialMatch(rewritten.lexicalQuery, lexicalAnchors);
    const status = needsClarification
      ? 'needs_clarification'
      : partial
        ? 'partial'
        : parents.length
          ? 'grounded'
          : 'no_match';

    return this.outcome({
      status,
      results: parents,
      rewritten,
      vectorStatus: vectorRun.status,
      keywordStatus: keywordRun.status,
      rerankerStatus,
      candidateCounts: {
        vector: normalizedVectorResults.length,
        keyword: normalizedKeywordResults.length,
        fused: hybridCandidates.length,
        final: parents.length,
      },
      minSimilarity,
      minRerankScore,
      timingsMs: {
        rewrite: rewriteMs,
        retrieval: retrievalMs,
        rerank: rerankMs,
        total: performance.now() - startedAt,
      },
      errors,
    });
  }

  private async runVariants<T>(
    variants: string[],
    task: (variant: string) => Promise<T[]>,
  ): Promise<VariantRun<T>> {
    const settled = await Promise.allSettled(variants.map(task));
    const results = settled
      .filter(
        (item): item is PromiseFulfilledResult<T[]> =>
          item.status === 'fulfilled',
      )
      .map((item) => item.value);
    const errors = settled
      .filter(
        (item): item is PromiseRejectedResult => item.status === 'rejected',
      )
      .map((item) => this.errorMessage('retrieval pipeline', item.reason));
    return {
      results,
      status:
        results.length === 0 ? 'failed' : errors.length ? 'partial' : 'ok',
      errors,
    };
  }

  private mergeVectorRankings(
    rankings: Awaited<ReturnType<VectorStoreService['searchSimilarChunks']>>[],
  ) {
    const map = new Map<string, (typeof rankings)[number][number]>();
    for (const ranking of rankings) {
      for (const result of ranking) {
        const current = map.get(result.id);
        if (!current || result.similarity > current.similarity) {
          map.set(result.id, result);
        }
      }
    }
    return [...map.values()].sort((a, b) => b.similarity - a.similarity);
  }

  private mergeKeywordRankings(rankings: KeywordSearchResult[][]) {
    const map = new Map<string, KeywordSearchResult>();
    for (const ranking of rankings) {
      for (const result of ranking) {
        const current = map.get(result.id);
        if (!current || result.keywordRank > current.keywordRank) {
          map.set(result.id, result);
        }
      }
    }
    return [...map.values()].sort((a, b) => b.keywordRank - a.keywordRank);
  }

  private findLexicalAnchors(
    keywordResults: RetrievalResult[],
    lexicalQuery: string,
  ): RetrievalResult[] {
    const terms = lexicalQuery
      .split(/[\s,，。！？?、:：;；]+/)
      .map((term) => term.trim())
      .filter(
        (term) =>
          term.length >= 4 &&
          !/^(哪些|所有|专业|信息|什么|怎么|如何|请问)$/.test(term),
      )
      .sort((left, right) => right.length - left.length);
    const anchors: RetrievalResult[] = [];
    for (const term of terms) {
      for (const match of keywordResults.filter(
        (item) =>
          item.content.includes(term) || item.sectionTitle?.includes(term),
      )) {
        const key = this.sectionKey(match);
        if (!anchors.some((anchor) => this.sectionKey(anchor) === key)) {
          anchors.push(match);
        }
        if (anchors.length === 5) return anchors;
      }
    }
    return anchors;
  }

  private async restoreParentSections(
    rerankedResults: RetrievalResult[],
    anchors: RetrievalResult[],
    context: RetrievalContext,
    limit: number,
  ) {
    const seeds = this.uniqueSections(
      anchors.length ? anchors : rerankedResults,
    ).slice(0, limit);
    return Promise.all(
      seeds.map((seed) => this.loadParentSection(seed, context)),
    );
  }

  private async loadParentSection(
    seed: RetrievalResult,
    context: RetrievalContext,
  ): Promise<RetrievalResult> {
    if (seed.indexVersion < 2) return seed;
    const rows = await this.prisma.$queryRaw<KeywordSearchResult[]>`
      SELECT dc."id", dc."documentId", dc."knowledgeBaseId",
        dc."chunkIndex", dc."sectionIndex", dc."sectionTitle",
        dc."chunkInSection", dc."indexVersion", dc."content",
        d."name" AS "documentName",
        0::double precision AS "keywordRank"
      FROM "DocumentChunk" dc
      INNER JOIN "Document" d ON d."id" = dc."documentId"
      WHERE dc."documentId" = ${seed.documentId}
        AND dc."organizationId" = ${context.organizationId}
        AND dc."departmentId" = ${context.departmentId}
        AND dc."knowledgeBaseId" = ${context.knowledgeBaseId}
        AND dc."sectionIndex" = ${seed.sectionIndex}
        AND dc."indexVersion" = ${seed.indexVersion}
        AND dc."isActive" = true
        AND d."status" = 'PUBLISHED'
      ORDER BY dc."chunkInSection" ASC
    `;
    if (!rows.length) return seed;
    return {
      ...seed,
      id: rows[0].id,
      chunkIndex: rows[0].chunkIndex,
      chunkInSection: rows[0].chunkInSection,
      content: this.mergeOverlappingChunks(rows.map((row) => row.content)),
    };
  }

  private uniqueSections(results: RetrievalResult[]) {
    const seen = new Set<string>();
    return results.filter((result) => {
      const key = this.sectionKey(result);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private sectionKey(result: RetrievalResult) {
    return result.indexVersion >= 2
      ? `${result.documentId}:${result.sectionIndex}:${result.indexVersion}`
      : result.id;
  }

  private isPartialMatch(lexicalQuery: string, anchors: RetrievalResult[]) {
    if (
      anchors.length !== 1 ||
      !/(?:和|与|以及|分别|对比|比较)/.test(lexicalQuery)
    ) {
      return false;
    }
    const entityTerms = lexicalQuery
      .split(/[\s,，。！？?、:：;；]+/)
      .filter((term) => term.length >= 4);
    return entityTerms.length >= 2;
  }

  private mergeOverlappingChunks(contents: string[]) {
    return contents.reduce((merged, current) => {
      if (!merged) return current;
      const maxOverlap = Math.min(240, merged.length, current.length);
      for (let size = maxOverlap; size >= 20; size--) {
        if (merged.endsWith(current.slice(0, size))) {
          return `${merged}${current.slice(size)}`;
        }
      }
      return `${merged}\n${current}`;
    }, '');
  }

  private async keywordSearch(
    lexicalQuery: string,
    context: RetrievalContext,
    limit: number,
  ): Promise<KeywordSearchResult[]> {
    return this.prisma.$queryRaw<KeywordSearchResult[]>`
      SELECT dc."id", dc."documentId", dc."knowledgeBaseId",
        dc."chunkIndex", dc."sectionIndex", dc."sectionTitle",
        dc."chunkInSection", dc."indexVersion", dc."content",
        d."name" AS "documentName",
        pdb.score(dc."id")::double precision AS "keywordRank"
      FROM "DocumentChunk" dc
      INNER JOIN "Document" d ON d."id" = dc."documentId"
      WHERE dc."content" ||| ${lexicalQuery}
        AND dc."organizationId" = ${context.organizationId}
        AND dc."departmentId" = ${context.departmentId}
        AND dc."knowledgeBaseId" = ${context.knowledgeBaseId}
        AND dc."isActive" = true
        AND d."status" = 'PUBLISHED'
      ORDER BY pdb.score(dc."id") DESC
      LIMIT ${limit}
    `;
  }

  private fuseResults(
    vectorResults: RetrievalResult[],
    keywordResults: RetrievalResult[],
    limit: number,
  ) {
    const rrfK = 60;
    const map = new Map<string, { result: RetrievalResult; score: number }>();
    const add = (result: RetrievalResult, rank: number) => {
      const score = 1 / (rrfK + rank);
      const existing = map.get(result.id);
      if (existing) {
        existing.score += score;
        existing.result = {
          ...existing.result,
          similarity: Math.max(existing.result.similarity, result.similarity),
          keywordRank: result.keywordRank ?? existing.result.keywordRank,
        };
      } else {
        map.set(result.id, { result: { ...result }, score });
      }
    };
    vectorResults.forEach((result, index) => add(result, index + 1));
    keywordResults.forEach((result, index) => add(result, index + 1));
    return [...map.values()]
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ result, score }) => ({ ...result, retrievalScore: score }));
  }

  private numberConfig(key: string, fallback: number) {
    const value = Number(this.configService?.get<string | number>(key));
    return Number.isFinite(value) ? value : fallback;
  }

  private errorMessage(stage: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`${stage} failed: ${message}`);
    return `${stage}: ${message}`.slice(0, 500);
  }

  private emptyOutcome(
    query: string,
    minSimilarity: number,
    minRerankScore: number,
  ): RetrievalOutcome {
    return {
      status: 'no_match',
      results: [],
      diagnostics: {
        status: 'no_match',
        originalQuery: query,
        semanticQueries: [],
        lexicalQueries: [],
        corrections: [],
        aliases: [],
        vectorStatus: 'failed',
        keywordStatus: 'failed',
        rerankerStatus: 'not_run',
        degraded: false,
        candidateCounts: { vector: 0, keyword: 0, fused: 0, final: 0 },
        thresholds: { minSimilarity, minRerankScore },
        timingsMs: { total: 0 },
        errors: [],
        sections: [],
      },
    };
  }

  private outcome(input: {
    status: RetrievalOutcome['status'];
    results: RetrievalResult[];
    rewritten: Awaited<ReturnType<QueryRewriteService['rewrite']>>;
    vectorStatus: RetrievalDiagnostics['vectorStatus'];
    keywordStatus: RetrievalDiagnostics['keywordStatus'];
    rerankerStatus: RetrievalDiagnostics['rerankerStatus'];
    candidateCounts: RetrievalDiagnostics['candidateCounts'];
    minSimilarity: number;
    minRerankScore: number;
    timingsMs: Record<string, number>;
    errors: string[];
  }): RetrievalOutcome {
    const diagnostics: RetrievalDiagnostics = {
      status: input.status,
      originalQuery: input.rewritten.originalQuery,
      semanticQueries: input.rewritten.semanticQueries,
      lexicalQueries: input.rewritten.lexicalQueries,
      corrections: input.rewritten.corrections,
      aliases: input.rewritten.aliases,
      vectorStatus: input.vectorStatus,
      keywordStatus: input.keywordStatus,
      rerankerStatus: input.rerankerStatus,
      degraded:
        input.vectorStatus !== 'ok' ||
        input.keywordStatus !== 'ok' ||
        input.rerankerStatus === 'fallback',
      candidateCounts: input.candidateCounts,
      thresholds: {
        minSimilarity: input.minSimilarity,
        minRerankScore: input.minRerankScore,
      },
      timingsMs: Object.fromEntries(
        Object.entries(input.timingsMs).map(([key, value]) => [
          key,
          Math.round(value),
        ]),
      ),
      errors: input.errors,
      sections: input.results.map((result) => ({
        documentId: result.documentId,
        documentName: result.documentName,
        sectionIndex: result.sectionIndex,
        sectionTitle: result.sectionTitle,
        similarity: result.similarity,
        rerankScore: result.rerankScore ?? null,
      })),
    };
    return { status: input.status, results: input.results, diagnostics };
  }
}
