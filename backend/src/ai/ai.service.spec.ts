import { AiService } from './ai.service';

describe('AiService retrieval outcomes', () => {
  const diagnostics = {
    status: 'no_match',
    originalQuery: 'question',
    semanticQueries: ['question'],
    lexicalQueries: ['question'],
    corrections: [],
    aliases: [],
    vectorStatus: 'ok',
    keywordStatus: 'ok',
    rerankerStatus: 'not_run',
    degraded: false,
    candidateCounts: { vector: 0, keyword: 0, fused: 0, final: 0 },
    thresholds: { minSimilarity: 0.35, minRerankScore: 0.15 },
    timingsMs: { total: 1 },
    errors: [],
    sections: [],
  } as const;

  it('returns no_match without preparing an LLM request', async () => {
    const retrieval = {
      searchDetailed: jest.fn().mockResolvedValue({
        status: 'no_match',
        results: [],
        diagnostics,
      }),
    };
    const contextBuilder = { build: jest.fn() };
    const provider = { stream: jest.fn() };
    const service = new AiService(
      retrieval as never,
      contextBuilder,
      provider as never,
    );

    await expect(
      service.prepareRag('missing answer', {
        organizationId: 'org-1',
        departmentId: 'dept-1',
        knowledgeBaseId: 'kb-1',
      }),
    ).resolves.toEqual({
      status: 'no_match',
      messages: [],
      chunks: [],
      diagnostics,
    });
    expect(contextBuilder.build).not.toHaveBeenCalled();
    expect(provider.stream).not.toHaveBeenCalled();
  });

  it('passes recent conversation history to generation without stale citation numbers', async () => {
    const chunk = {
      id: 'chunk-1',
      documentId: 'doc-1',
      documentName: 'plan.pdf',
      knowledgeBaseId: 'kb-1',
      chunkIndex: 1,
      content: '天津中医药大学 医学信息工程',
      similarity: 0.8,
      retrievalScore: 0.03,
    };
    const service = new AiService(
      {
        searchDetailed: jest.fn().mockResolvedValue({
          status: 'grounded',
          results: [chunk],
          diagnostics: { ...diagnostics, status: 'grounded' },
        }),
      } as never,
      { build: jest.fn().mockReturnValue('[SOURCE 1]\ncontent') },
      { stream: jest.fn() } as never,
    );

    const prepared = await service.prepareRag(
      '那另一所学校呢？',
      {
        organizationId: 'org-1',
        departmentId: 'dept-1',
        knowledgeBaseId: 'kb-1',
      },
      [
        { role: 'USER', content: '天津中医药大学有哪些专业？' },
        { role: 'ASSISTANT', content: '医学信息工程。[1]' },
      ],
    );

    expect(prepared.messages.slice(1, 3)).toEqual([
      { role: 'user', content: '天津中医药大学有哪些专业？' },
      { role: 'assistant', content: '医学信息工程。' },
    ]);
    expect(prepared.messages.at(-1)?.content).toContain('那另一所学校呢？');
  });

  it('keeps grounded sources when the model omits inline citation markers', () => {
    const service = new AiService({} as never, {} as never, {} as never);
    const citations = service.buildCitations(
      [
        {
          id: 'chunk-1',
          documentId: 'doc-1',
          documentName: 'policy.pdf',
          knowledgeBaseId: 'kb-1',
          chunkIndex: 1,
          content: 'supported fact',
          similarity: 0.8,
          retrievalScore: 0.03,
        } as never,
      ],
      'The answer is supported but has no inline marker.',
    );

    expect(citations).toHaveLength(1);
    expect(citations[0].sourceNumber).toBe(1);
  });
});
