import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListDocumentsDto } from './dto/list.dto';
import {
  DocumentStatus,
  ProcessStatus,
  KnowledgeBaseStatus,
} from 'src/generated/prisma/enums';
import { QueryMode } from 'src/generated/prisma/internal/prismaNamespace';
import { CreateDocumentDto } from './dto/create.dto';
import { AuthUser } from 'src/auth/types/auth-user';
import { Prisma } from 'src/generated/prisma/client';
import { UpdateDocumentDto } from './dto/update.dto';
// import { DocumentProcessingService } from "src/document-processing/document-processing.service";
import { StorageService } from 'src/storage/storage.service';
import { randomUUID } from 'crypto';
import path from 'path';
import { Queue } from 'bullmq';
import { DocumentProcessingService } from 'src/document-processing/document-processing.service';
import { DocumentParserService } from 'src/document-processing/parser/document-parser.service';
import { EmbeddingsService } from 'src/embeddings/embeddings.service';
import { VectorStoreService } from 'src/embeddings/vector-store.service';
import { CreateDocumentChunkDto } from './dto/create-chunk.dto';
import { UpdateDocumentChunkDto } from './dto/update-chunk.dto';
import * as mammoth from 'mammoth';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
    private readonly documentProcessingService: DocumentProcessingService,
    private readonly documentParserService: DocumentParserService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async getDocumentChunks(documentId: string) {
    await this.getReviewableDocument(documentId, false);
    return this.prismaService.documentChunk.findMany({
      where: { documentId, isActive: true },
      orderBy: { chunkIndex: 'asc' },
      select: {
        id: true,
        documentId: true,
        chunkIndex: true,
        sectionIndex: true,
        sectionTitle: true,
        chunkInSection: true,
        content: true,
        charCount: true,
        tokenCount: true,
        metadata: true,
        embeddingModel: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createDocumentChunk(documentId: string, dto: CreateDocumentChunkDto) {
    const document = await this.getReviewableDocument(documentId, true);
    const content = dto.content.trim();
    const embedding = await this.embeddingsService.embed(content);
    const latest = await this.prismaService.documentChunk.aggregate({
      where: { documentId },
      _max: { chunkIndex: true, sectionIndex: true },
    });
    const chunk = await this.prismaService.documentChunk.create({
      data: {
        documentId,
        organizationId: document.organizationId,
        departmentId: document.departmentId,
        knowledgeBaseId: document.knowledgeBaseId,
        chunkIndex: (latest._max.chunkIndex ?? -1) + 1,
        sectionIndex: (latest._max.sectionIndex ?? -1) + 1,
        sectionTitle: 'Manual section',
        chunkInSection: 0,
        content,
        charCount: content.length,
        isActive: true,
        indexVersion: 2,
        metadata: { source: 'manual' },
      },
    });
    try {
      await this.vectorStoreService.saveChunkEmbeddings([
        { chunkId: chunk.id, vector: embedding.vector, model: embedding.model },
      ]);
    } catch (error) {
      await this.prismaService.documentChunk.delete({
        where: { id: chunk.id },
      });
      throw error;
    }
    return this.prismaService.documentChunk.findUnique({
      where: { id: chunk.id },
    });
  }

  async updateDocumentChunk(chunkId: string, dto: UpdateDocumentChunkDto) {
    const current = await this.prismaService.documentChunk.findUnique({
      where: { id: chunkId },
      include: { document: { select: { status: true } } },
    });
    if (!current) throw new NotFoundException('Document chunk not found');
    if (!current.isActive)
      throw new NotFoundException('Document chunk not found');
    if (current.document.status !== DocumentStatus.REVIEWING) {
      throw new ConflictException('Document must be in REVIEWING status');
    }
    const content = dto.content?.trim();
    if (content === undefined) return current;
    const embeddingText =
      current.sectionTitle && !content.includes(current.sectionTitle)
        ? `${current.sectionTitle}\n${content}`
        : content;
    const embedding = await this.embeddingsService.embed(embeddingText);
    await this.prismaService.documentChunk.update({
      where: { id: chunkId },
      data: { content, charCount: content.length },
    });
    await this.vectorStoreService.saveChunkEmbeddings([
      { chunkId, vector: embedding.vector, model: embedding.model },
    ]);
    return this.prismaService.documentChunk.findUnique({
      where: { id: chunkId },
    });
  }

  async deleteDocumentChunk(chunkId: string) {
    const current = await this.prismaService.documentChunk.findUnique({
      where: { id: chunkId },
      include: { document: { select: { status: true } } },
    });
    if (!current) throw new NotFoundException('Document chunk not found');
    if (!current.isActive)
      throw new NotFoundException('Document chunk not found');
    if (current.document.status !== DocumentStatus.REVIEWING) {
      throw new ConflictException('Document must be in REVIEWING status');
    }
    return this.prismaService.documentChunk.update({
      where: { id: chunkId },
      data: { isActive: false },
    });
  }

  async startDocumentReview(documentId: string) {
    const document = await this.getReviewableDocument(documentId, false);
    if (document.status !== DocumentStatus.PARSED) {
      throw new ConflictException('Only parsed documents can enter review');
    }
    return this.prismaService.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.REVIEWING },
    });
  }

  async publishDocument(documentId: string) {
    const document = await this.getReviewableDocument(documentId, false);
    if (document.status !== DocumentStatus.REVIEWING) {
      throw new ConflictException('Only reviewing documents can be published');
    }
    const [chunkCount, invalidChunkCount] = await Promise.all([
      this.prismaService.documentChunk.count({
        where: { documentId, isActive: true },
      }),
      this.prismaService.documentChunk.count({
        where: {
          documentId,
          isActive: true,
          OR: [{ content: '' }, { embeddingModel: null }],
        },
      }),
    ]);
    if (chunkCount === 0 || invalidChunkCount > 0) {
      throw new ConflictException('All chunks must contain indexed content');
    }
    return this.prismaService.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.PUBLISHED },
    });
  }

  private async getReviewableDocument(
    documentId: string,
    requireReview: boolean,
  ) {
    const document = await this.prismaService.document.findFirst({
      where: { id: documentId, status: { not: DocumentStatus.ARCHIVED } },
    });
    if (!document) throw new NotFoundException('Document not found');
    if (requireReview && document.status !== DocumentStatus.REVIEWING) {
      throw new ConflictException('Document must be in REVIEWING status');
    }
    return document;
  }

  async getDocuments(knowledgeBaseId: string, dto: ListDocumentsDto) {
    const search = dto.search?.trim() || '';
    const pageNumber = dto.pageNumber ?? 1;
    const pageSize = Math.min(dto.pageSize ?? 20, 100);
    const where = {
      knowledgeBaseId: knowledgeBaseId,
      status: dto.status ?? {
        not: DocumentStatus.ARCHIVED,
      },
      ...(search && {
        name: {
          contains: search,
          mode: QueryMode.insensitive,
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prismaService.document.findMany({
        where,
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: dto.order ?? 'desc',
        },
      }),
      this.prismaService.document.count({
        where,
      }),
    ]);
    return {
      items,
      total,
    };
  }

  async getDocumentById(documentId: string) {
    const doc = await this.prismaService.document.findFirst({
      where: {
        id: documentId,
        status: {
          not: DocumentStatus.ARCHIVED,
        },
      },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    return doc;
  }

  async uploadDocument(
    knowledgeBaseId: string,
    file: Express.Multer.File,
    dto: CreateDocumentDto,
    currentUser: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // 文件类型是否合法
    if (!this.documentParserService.supports(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `Unsupported file type: ${file.mimetype}`,
      );
    }

    const kb = await this.prismaService.knowledgeBase.findFirst({
      where: {
        id: knowledgeBaseId,
        status: KnowledgeBaseStatus.ACTIVE,
      },
    });

    if (!kb) {
      throw new NotFoundException('Knowledge base not found');
    }

    const normalizedName = dto.name.trim() || file.originalname;

    const exactDocument = await this.prismaService.document.findFirst({
      where: {
        knowledgeBaseId,
        name: normalizedName,
        status: {
          not: DocumentStatus.ARCHIVED,
        },
      },
    });
    if (exactDocument) {
      throw new ConflictException('Document with this name already exists');
    }

    const ext = path.extname(file.originalname);

    const storageKey = `${kb.organizationId}/${knowledgeBaseId}/${randomUUID()}${ext}`;

    await this.storageService.uploadFile(
      storageKey,
      file.buffer,
      file.mimetype,
    );

    // 防止P2002: 防止两个并发请求造成重复创建
    try {
      const document = await this.prismaService.document.create({
        data: {
          name: normalizedName,
          description: dto.description,
          organizationId: kb.organizationId,
          departmentId: kb.departmentId,
          knowledgeBaseId: knowledgeBaseId,
          createdById: currentUser.id,
          originalName: file.originalname,
          storageKey,
          mimeType: file.mimetype,
          size: file.size,
        },
      });

      await this.documentProcessingService.createProcess(document.id);

      await this.prismaService.document.update({
        where: {
          id: document.id,
        },
        data: {
          status: DocumentStatus.PROCESSING,
        },
      });
      return document;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Document with this name already exists');
      }
      throw error;
    }
  }

  // 不复用原来的失败 DocumentProcess，而是创建一个新的 Process，再丢一个新的 BullMQ Job
  async reprocessDocument(documentId: string) {
    const document = await this.prismaService.document.findUnique({
      where: {
        id: documentId,
      },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status !== DocumentStatus.FAILED) {
      throw new ConflictException('Only failed documents can be reprocessed');
    }

    const activeProcess = await this.prismaService.documentProcess.findFirst({
      where: {
        documentId,
        status: {
          in: [ProcessStatus.PENDING, ProcessStatus.PROCESSING],
        },
      },
    });

    if (activeProcess) {
      throw new ConflictException('Document is already being processed');
    }

    return this.documentProcessingService.createProcess(documentId);
  }

  async updateDocument(documentId: string, dto: UpdateDocumentDto) {
    // 1. 检查文档是否存在
    const exactDocument = await this.prismaService.document.findFirst({
      where: {
        id: documentId,
        status: {
          not: DocumentStatus.ARCHIVED,
        },
      },
    });

    if (!exactDocument) {
      throw new NotFoundException('Document not found');
    }

    // name 可能没有传
    const normalizedName = dto.name?.trim();

    // 2. 检查文档名是否已存在
    if (normalizedName && normalizedName !== exactDocument.name) {
      const exactNameDocument = await this.prismaService.document.findFirst({
        where: {
          knowledgeBaseId: exactDocument.knowledgeBaseId,
          name: normalizedName,
          status: {
            not: DocumentStatus.ARCHIVED,
          },
          NOT: {
            id: documentId,
          },
        },
      });

      if (exactNameDocument) {
        throw new ConflictException('Document with this name already exists');
      }
    }

    // 3. 更新文档
    return this.prismaService.document.update({
      where: {
        id: documentId,
      },
      data: {
        ...(normalizedName !== undefined && {
          name: normalizedName,
        }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
      },
    });
  }

  async archiveDocument(documentId: string) {
    const document = await this.prismaService.document.findFirst({
      where: {
        id: documentId,
        status: {
          not: DocumentStatus.ARCHIVED,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.prismaService.document.update({
      where: {
        id: documentId,
      },
      data: {
        status: DocumentStatus.ARCHIVED,
      },
    });
  }

  async downloadDocument(documentId: string) {
    const document = await this.prismaService.document.findFirst({
      where: {
        id: documentId,
        status: {
          not: DocumentStatus.ARCHIVED,
        },
      },
      select: {
        storageKey: true,
        originalName: true,
        mimeType: true,
      },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return this.storageService.downloadFile(document.storageKey);
  }

  async getDocumentPreviewContent(documentId: string) {
    const document = await this.prismaService.document.findFirst({
      where: { id: documentId, status: { not: DocumentStatus.ARCHIVED } },
      select: { storageKey: true, mimeType: true, extractedText: true },
    });
    if (!document) throw new NotFoundException('Document not found');

    const isDocx =
      document.mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (isDocx) {
      const buffer = await this.storageService.getFileBuffer(
        document.storageKey,
      );
      const result = await mammoth.convertToHtml({ buffer });
      return { type: 'html' as const, content: result.value };
    }

    if (
      document.mimeType === 'text/markdown' ||
      document.mimeType === 'text/plain'
    ) {
      return {
        type: 'text' as const,
        content: document.extractedText ?? '',
      };
    }

    return { type: 'unsupported' as const, content: '' };
  }
}
