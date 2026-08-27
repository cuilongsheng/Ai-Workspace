import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { AuthUser } from 'src/auth/types/auth-user';
import { PrismaService } from 'src/prisma/prisma.service';
import { DepartmentsService } from 'src/departments/departments.service';
import { ListKnowledgeBaseDto } from './dto/list-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import { KnowledgeBaseStatus } from 'src/generated/prisma/enums';
import { QueryMode } from 'src/generated/prisma/internal/prismaNamespace';
import { KnowledgeBaseAccessService } from './knowledge-bases.access.service';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private readonly departmentService: DepartmentsService,
    private readonly prisma: PrismaService,
    private readonly accessService: KnowledgeBaseAccessService,
  ) {}

  async createKnowledgeBase(
    dto: CreateKnowledgeBaseDto,
    currentUser: AuthUser,
    departmentId: string,
  ) {
    // 1. Check if the department exists
    const department =
      await this.departmentService.getDepartmentById(departmentId);

    // 2. Check if departmentId and dto.name is unique
    const normalizedName = dto.name.trim();
    const existingKnowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        departmentId,
        name: normalizedName,
        // status: KnowledgeBaseStatus.ACTIVE
      },
    });

    if (existingKnowledgeBase) {
      throw new ConflictException('Knowledge base already exists');
    }
    // 3. Create the knowledge base
    return this.prisma.knowledgeBase.create({
      data: {
        name: normalizedName,
        description: dto.description,
        organizationId: department.organizationId,
        departmentId,
        createdById: currentUser.id,
      },
    });
  }

  async listKnowledgeBase(dto: ListKnowledgeBaseDto, departmentId: string) {
    const search = dto.search?.trim() || '';
    const pageNumber = dto.pageNumber ?? 1;
    const pageSize = Math.min(dto.pageSize ?? 20, 100);
    const where = {
      departmentId,
      ...(search && {
        name: {
          contains: search,
          mode: QueryMode.insensitive,
        },
      }),
      status: KnowledgeBaseStatus.ACTIVE,
    };

    const [items, total] = await Promise.all([
      this.prisma.knowledgeBase.findMany({
        where,
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.knowledgeBase.count({
        where,
      }),
    ]);
    return {
      items,
      total,
    };
  }

  async getKnowledgeBaseById(departmentId: string, knowledgeBaseId: string) {
    return this.accessService.getAccessibleKnowledgeBase(
      departmentId,
      knowledgeBaseId,
    );
  }

  async getReadiness(departmentId: string, knowledgeBaseId: string) {
    const knowledgeBase = await this.accessService.getAccessibleKnowledgeBase(
      departmentId,
      knowledgeBaseId,
    );
    const documentScope = { knowledgeBaseId: knowledgeBase.id };
    const publishedScope = {
      knowledgeBaseId: knowledgeBase.id,
      status: 'PUBLISHED' as const,
    };
    const [
      publishedDocuments,
      processingDocuments,
      failedDocuments,
      searchableChunks,
      embeddedChunks,
      lastIndexed,
      lastTrace,
    ] = await Promise.all([
      this.prisma.document.count({ where: publishedScope }),
      this.prisma.document.count({
        where: {
          ...documentScope,
          status: { in: ['UPLOADING', 'PROCESSING'] },
        },
      }),
      this.prisma.document.count({
        where: { ...documentScope, status: 'FAILED' },
      }),
      this.prisma.documentChunk.count({
        where: {
          document: publishedScope,
          isActive: true,
          content: { not: '' },
        },
      }),
      this.prisma.documentChunk.count({
        where: {
          document: publishedScope,
          isActive: true,
          content: { not: '' },
          embeddingModel: { not: null },
        },
      }),
      this.prisma.documentChunk.aggregate({
        where: {
          document: publishedScope,
          isActive: true,
          content: { not: '' },
          embeddingModel: { not: null },
        },
        _max: { updatedAt: true },
      }),
      this.prisma.ragTrace.findFirst({
        where: {
          message: { conversation: { knowledgeBaseId: knowledgeBase.id } },
        },
        orderBy: { createdAt: 'desc' },
        select: { status: true, diagnostics: true, createdAt: true },
      }),
    ]);
    return {
      status:
        publishedDocuments > 0 &&
        searchableChunks > 0 &&
        embeddedChunks === searchableChunks
          ? ('READY' as const)
          : ('NOT_READY' as const),
      publishedDocuments,
      searchableChunks,
      embeddedChunks,
      processingDocuments,
      failedDocuments,
      lastIndexedAt: lastIndexed._max.updatedAt,
      lastRetrievalAt: lastTrace?.createdAt ?? null,
      lastRetrievalStatus: lastTrace?.status ?? null,
      services: this.readServiceHealth(lastTrace?.diagnostics),
    };
  }

  private readServiceHealth(diagnostics: Prisma.JsonValue | undefined) {
    if (
      !diagnostics ||
      Array.isArray(diagnostics) ||
      typeof diagnostics !== 'object'
    ) {
      return { vector: 'unknown', keyword: 'unknown', reranker: 'unknown' };
    }
    const value = diagnostics as Record<string, Prisma.JsonValue>;
    return {
      vector:
        typeof value.vectorStatus === 'string' ? value.vectorStatus : 'unknown',
      keyword:
        typeof value.keywordStatus === 'string'
          ? value.keywordStatus
          : 'unknown',
      reranker:
        typeof value.rerankerStatus === 'string'
          ? value.rerankerStatus
          : 'unknown',
    };
  }

  async getStarterQuestions(departmentId: string, knowledgeBaseId: string) {
    const knowledgeBase = await this.accessService.getAccessibleKnowledgeBase(
      departmentId,
      knowledgeBaseId,
    );
    const configured = knowledgeBase.starterQuestions;
    const questions = Array.isArray(configured)
      ? configured.filter(
          (item): item is string => typeof item === 'string' && Boolean(item),
        )
      : [];
    return { knowledgeBaseId, questions };
  }

  async updateStarterQuestions(
    departmentId: string,
    knowledgeBaseId: string,
    questions: string[],
  ) {
    const knowledgeBase = await this.accessService.getAccessibleKnowledgeBase(
      departmentId,
      knowledgeBaseId,
    );
    const normalized = questions.map((item) => item.trim()).filter(Boolean);
    await this.prisma.knowledgeBase.update({
      where: { id: knowledgeBase.id },
      data: { starterQuestions: normalized },
    });
    return { knowledgeBaseId, questions: normalized };
  }

  async updateKnowledgeBase(
    departmentId: string,
    knowledgeBaseId: string,
    dto: UpdateKnowledgeBaseDto,
  ) {
    const normalizedName = dto.name?.trim();
    // 1. Check if the knowledge base exists
    const knowledgeBase = await this.accessService.getAccessibleKnowledgeBase(
      departmentId,
      knowledgeBaseId,
    );
    // 2. Check if the new knowledge base name already exists
    if (normalizedName) {
      const exists = await this.prisma.knowledgeBase.findFirst({
        where: {
          departmentId,
          name: normalizedName,
          status: KnowledgeBaseStatus.ACTIVE,
          NOT: {
            id: knowledgeBaseId,
          },
        },
      });

      if (exists) {
        throw new BadRequestException('KnowledgeBase name already exists');
      }
    }

    try {
      // 3. Update the knowledge base
      return await this.prisma.knowledgeBase.update({
        // 必须是唯一条件
        where: {
          id: knowledgeBase.id,
        },
        data: {
          ...(normalizedName && {
            name: normalizedName,
          }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Knowledge base name already exists');
      }
      throw error;
    }
  }

  async archiveKnowledgeBase(departmentId: string, knowledgeBaseId: string) {
    // 1. Check if the department exists
    const knowledgeBase = await this.accessService.getAccessibleKnowledgeBase(
      departmentId,
      knowledgeBaseId,
    );

    // 2. Delete the knowledge base
    return this.prisma.knowledgeBase.update({
      // 必须是唯一条件
      where: {
        id: knowledgeBase.id,
      },
      data: {
        status: KnowledgeBaseStatus.ARCHIVED,
      },
    });
  }
}
