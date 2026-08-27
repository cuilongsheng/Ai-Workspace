import { KnowledgeBaseService } from './knowledge-bases.service';

describe('KnowledgeBaseService readiness', () => {
  const prisma = {
    document: { count: jest.fn() },
    documentChunk: { count: jest.fn(), aggregate: jest.fn() },
    ragTrace: { findFirst: jest.fn() },
  };
  const accessService = { getAccessibleKnowledgeBase: jest.fn() };
  const service = new KnowledgeBaseService(
    {} as never,
    prisma as never,
    accessService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    accessService.getAccessibleKnowledgeBase.mockResolvedValue({ id: 'kb-1' });
    prisma.documentChunk.aggregate.mockResolvedValue({
      _max: { updatedAt: new Date('2026-08-25T10:00:00.000Z') },
    });
    prisma.ragTrace.findFirst.mockResolvedValue(null);
  });

  it('is ready only when published chunks are fully embedded', async () => {
    prisma.document.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prisma.documentChunk.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(12);

    await expect(service.getReadiness('dept-1', 'kb-1')).resolves.toMatchObject(
      {
        status: 'READY',
        publishedDocuments: 2,
        searchableChunks: 12,
        embeddedChunks: 12,
      },
    );
  });

  it('is not ready when parsed documents have not been published', async () => {
    prisma.document.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prisma.documentChunk.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    await expect(service.getReadiness('dept-1', 'kb-1')).resolves.toMatchObject(
      {
        status: 'NOT_READY',
        publishedDocuments: 0,
        searchableChunks: 0,
      },
    );
  });
});
