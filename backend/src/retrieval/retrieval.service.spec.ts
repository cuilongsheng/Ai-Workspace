import { RetrievalService } from './retrieval.service';

describe('RetrievalService parent section expansion', () => {
  it('restores an exact entity anchor and only expands its semantic parent', async () => {
    const anchor = {
      id: 'chunk-18',
      documentId: 'doc-1',
      knowledgeBaseId: 'kb-1',
      chunkIndex: 18,
      sectionIndex: 7,
      sectionTitle: '郑州升达经贸管理学院',
      chunkInSection: 0,
      indexVersion: 2,
      content: '志愿 46 郑州升达经贸管理学院 会计学',
      documentName: 'plan.pdf',
      keywordRank: 100,
    };
    const distractor = {
      ...anchor,
      id: 'chunk-22',
      chunkIndex: 22,
      sectionIndex: 8,
      sectionTitle: '其他学校',
      content: '其他学校 审计学 工商管理',
      keywordRank: 20,
    };
    const parentRows = [
      anchor,
      {
        ...anchor,
        id: 'chunk-19',
        chunkIndex: 19,
        chunkInSection: 1,
        content: '审计学 财务管理 税收学',
        keywordRank: 0,
      },
    ];
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([anchor, distractor])
        .mockResolvedValueOnce(parentRows)
        .mockResolvedValueOnce([distractor]),
    };
    const service = new RetrievalService(
      { embed: jest.fn().mockResolvedValue({ vector: [0.1] }) } as never,
      { searchSimilarChunks: jest.fn().mockResolvedValue([]) } as never,
      prisma as never,
      {
        rewrite: jest.fn().mockResolvedValue({
          originalQuery: '郑州升达经贸管理学院呢',
          semanticQuery: '郑州升达经贸管理学院有哪些专业？',
          lexicalQuery: '郑州升达经贸管理学院 专业',
          semanticQueries: ['郑州升达经贸管理学院有哪些专业？'],
          lexicalQueries: ['郑州升达经贸管理学院 专业'],
          corrections: [],
          aliases: [],
        }),
      } as never,
      {
        rerank: jest.fn().mockResolvedValue([
          {
            ...distractor,
            similarity: 0.6,
            retrievalScore: 0.03,
          },
        ]),
      } as never,
      { get: jest.fn() } as never,
    );

    const results = await service.search(
      '郑州升达经贸管理学院呢',
      {
        organizationId: 'org-1',
        departmentId: 'dept-1',
        knowledgeBaseId: 'kb-1',
      },
      { limit: 5 },
    );

    expect(results[0].sectionTitle).toBe('郑州升达经贸管理学院');
    expect(results[0].content).toContain('税收学');
    expect(results[0].content).not.toContain('其他学校');
  });

  it('continues with BM25 when vector retrieval fails', async () => {
    const anchor = {
      id: 'chunk-1',
      documentId: 'doc-1',
      knowledgeBaseId: 'kb-1',
      chunkIndex: 1,
      sectionIndex: 1,
      sectionTitle: '天津中医药大学',
      chunkInSection: 0,
      indexVersion: 2,
      content: '天津中医药大学 医学信息工程',
      documentName: 'plan.pdf',
      keywordRank: 80,
    };
    const service = new RetrievalService(
      { embed: jest.fn().mockRejectedValue(new Error('vector down')) } as never,
      {} as never,
      {
        $queryRaw: jest
          .fn()
          .mockResolvedValueOnce([anchor])
          .mockResolvedValueOnce([anchor]),
      } as never,
      {
        rewrite: jest.fn().mockResolvedValue({
          originalQuery: '天津中医药大学有哪些专业',
          semanticQuery: '天津中医药大学有哪些专业？',
          lexicalQuery: '天津中医药大学 专业',
          semanticQueries: ['天津中医药大学有哪些专业？'],
          lexicalQueries: ['天津中医药大学 专业'],
          corrections: [],
          aliases: [],
        }),
      } as never,
      { rerank: jest.fn() } as never,
      { get: jest.fn() } as never,
    );

    const outcome = await service.searchDetailed('天津中医药大学有哪些专业', {
      organizationId: 'org-1',
      departmentId: 'dept-1',
      knowledgeBaseId: 'kb-1',
    });

    expect(outcome.status).toBe('grounded');
    expect(outcome.diagnostics.vectorStatus).toBe('failed');
    expect(outcome.diagnostics.keywordStatus).toBe('ok');
    expect(outcome.diagnostics.degraded).toBe(true);
  });

  it('returns retrieval_unavailable when both primary pipelines fail', async () => {
    const service = new RetrievalService(
      { embed: jest.fn().mockRejectedValue(new Error('vector down')) } as never,
      {} as never,
      {
        $queryRaw: jest.fn().mockRejectedValue(new Error('bm25 down')),
      } as never,
      {
        rewrite: jest.fn().mockResolvedValue({
          originalQuery: 'question',
          semanticQuery: 'question',
          lexicalQuery: 'question',
          semanticQueries: ['question'],
          lexicalQueries: ['question'],
          corrections: [],
          aliases: [],
        }),
      } as never,
      { rerank: jest.fn() } as never,
      { get: jest.fn() } as never,
    );

    const outcome = await service.searchDetailed('question', {
      organizationId: 'org-1',
      departmentId: 'dept-1',
      knowledgeBaseId: 'kb-1',
    });

    expect(outcome.status).toBe('retrieval_unavailable');
    expect(outcome.results).toEqual([]);
  });
});
