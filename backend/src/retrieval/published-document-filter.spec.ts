import { PrismaService } from 'src/prisma/prisma.service';

import { VectorStoreService } from '../embeddings/vector-store.service';
import { RetrievalService } from './retrieval.service';

function sqlText(value: unknown): string {
  if (Array.isArray(value)) return value.join('');
  const query = value as { strings?: string[]; sql?: string; text?: string };
  return query.strings?.join('') ?? query.sql ?? query.text ?? '';
}

describe('published document retrieval boundary', () => {
  const context = {
    organizationId: 'organization-1',
    departmentId: 'department-1',
    knowledgeBaseId: 'knowledge-base-1',
  };

  it('filters vector recall to PUBLISHED documents', async () => {
    const queryRaw = jest.fn().mockResolvedValue([]);
    const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
    const service = new VectorStoreService(prisma);

    await service.searchSimilarChunks(Array<number>(1024).fill(0), context);

    expect(sqlText(queryRaw.mock.calls[0][0])).toContain(
      `d."status" = 'PUBLISHED'`,
    );
  });

  it('filters BM25 recall to PUBLISHED documents', async () => {
    const queryRaw = jest.fn().mockResolvedValue([]);
    const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
    const service = new RetrievalService(
      {} as never,
      {} as never,
      prisma,
      {} as never,
      {} as never,
      {} as never,
    );

    await (
      service as unknown as {
        keywordSearch: (
          query: string,
          scope: typeof context,
          limit: number,
        ) => Promise<unknown[]>;
      }
    ).keywordSearch('验收', context, 20);

    expect(sqlText(queryRaw.mock.calls[0][0])).toContain(
      `d."status" = 'PUBLISHED'`,
    );
  });
});
