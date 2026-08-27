import { ConflictException } from '@nestjs/common';
import { validate } from 'class-validator';
import { DocumentStatus } from 'src/generated/prisma/enums';
import { DocumentsService } from './documents.service';
import { CreateDocumentChunkDto } from './dto/create-chunk.dto';

describe('DocumentsService V1 review workflow', () => {
  const document = {
    id: 'doc-1',
    organizationId: 'org-1',
    departmentId: 'dept-1',
    knowledgeBaseId: 'kb-1',
    status: DocumentStatus.REVIEWING,
  };

  const prisma = {
    document: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    documentChunk: {
      aggregate: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };
  const embeddings = { embed: jest.fn() };
  const vectorStore = { saveChunkEmbeddings: jest.fn() };
  const service = new DocumentsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    embeddings as never,
    vectorStore as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates manual chunk content length', async () => {
    const dto = new CreateDocumentChunkDto();
    dto.content = '';

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('creates and indexes a trimmed chunk only while reviewing', async () => {
    prisma.document.findFirst.mockResolvedValue(document);
    prisma.documentChunk.aggregate.mockResolvedValue({
      _max: { chunkIndex: 2 },
    });
    prisma.documentChunk.create.mockResolvedValue({ id: 'chunk-1' });
    prisma.documentChunk.findUnique.mockResolvedValue({ id: 'chunk-1' });
    embeddings.embed.mockResolvedValue({ vector: [0.1], model: 'test' });
    vectorStore.saveChunkEmbeddings.mockResolvedValue(undefined);

    await service.createDocumentChunk('doc-1', { content: '  content  ' });

    expect(prisma.documentChunk.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: 'doc-1',
        chunkIndex: 3,
        content: 'content',
        charCount: 7,
      }),
    });
    expect(vectorStore.saveChunkEmbeddings).toHaveBeenCalledWith([
      { chunkId: 'chunk-1', vector: [0.1], model: 'test' },
    ]);
  });

  it('rejects chunk writes outside REVIEWING', async () => {
    prisma.document.findFirst.mockResolvedValue({
      ...document,
      status: DocumentStatus.PARSED,
    });

    await expect(
      service.createDocumentChunk('doc-1', { content: 'content' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('publishes only when every chunk is indexed', async () => {
    prisma.document.findFirst.mockResolvedValue(document);
    prisma.documentChunk.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);
    prisma.document.update.mockResolvedValue({
      ...document,
      status: DocumentStatus.PUBLISHED,
    });

    await service.publishDocument('doc-1');

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { status: DocumentStatus.PUBLISHED },
    });
  });

  it('rejects publication when a chunk is missing an embedding', async () => {
    prisma.document.findFirst.mockResolvedValue(document);
    prisma.documentChunk.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    await expect(service.publishDocument('doc-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
