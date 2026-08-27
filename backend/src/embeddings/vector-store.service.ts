import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface ChunkEmbedding {
  chunkId: string;
  vector: number[];
  model: string;
}

export interface SimilarChunk {
  id: string;
  documentId: string;
  documentName: string; // 方便前端直接显示来源
  knowledgeBaseId: string;
  chunkIndex: number;
  sectionIndex: number;
  sectionTitle: string | null;
  chunkInSection: number;
  indexVersion: number;
  content: string;
  similarity: number;
}

@Injectable()
export class VectorStoreService {
  constructor(private readonly prisma: PrismaService) {}

  async saveChunkEmbeddings(embeddings: ChunkEmbedding[]): Promise<void> {
    if (embeddings.length === 0) {
      return;
    }

    console.log(`开始保存 ${embeddings.length} 个 embeddings`);

    for (const [index, item] of embeddings.entries()) {
      console.log(`[${index + 1}/${embeddings.length}] 准备保存`, {
        chunkId: item.chunkId,
        dimensions: item.vector.length,
        model: item.model,
      });

      const vectorValue = `[${item.vector.join(',')}]`;

      console.log(`[${index + 1}] 开始执行 SQL`);

      try {
        const affected = await this.prisma.$executeRaw`
        UPDATE "DocumentChunk"
        SET
          "embedding" = ${vectorValue}::vector,
          "embeddingModel" = ${item.model},
          "updatedAt" = NOW()
        WHERE "id" = ${item.chunkId}
      `;

        console.log(`[${index + 1}] SQL 完成，affected =`, affected);
      } catch (error) {
        console.error(`[${index + 1}] embedding SQL 失败`, error);

        throw error;
      }
    }

    console.log(`Embeddings 保存完成: ${embeddings.length}`);
  }
  async searchSimilarChunks(
    queryVector: number[],
    options: {
      organizationId: string;
      departmentId: string;
      knowledgeBaseId: string;
      limit?: number;
      minSimilarity?: number;
    },
  ): Promise<SimilarChunk[]> {
    if (queryVector.length !== 1024) {
      throw new Error(
        `Invalid query embedding dimensions: expected 1024, received ${queryVector.length}`,
      );
    }

    const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);

    const minSimilarity = options.minSimilarity ?? 0;

    const vectorValue = `[${queryVector.join(',')}]`;

    // 即使 Chunk 数据理论上已经清理，也不要让归档文档进入 RAG
    const rows = await this.prisma.$queryRaw<SimilarChunk[]>`
    SELECT
      dc."id",
      dc."documentId",
      d."name" AS "documentName",
      dc."knowledgeBaseId",
      dc."chunkIndex",
      dc."sectionIndex",
      dc."sectionTitle",
      dc."chunkInSection",
      dc."indexVersion",
      dc."content",
      (
        1 - (
          dc."embedding" <=> ${vectorValue}::vector(1024)
        )
      )::double precision AS "similarity"
    FROM "DocumentChunk" dc
    INNER JOIN "Document" d
      ON d."id" = dc."documentId"
    WHERE
      dc."organizationId" = ${options.organizationId}
      AND dc."departmentId" = ${options.departmentId}
      AND dc."knowledgeBaseId" = ${options.knowledgeBaseId}
      AND dc."embedding" IS NOT NULL
      AND dc."isActive" = true
      AND d."status" = 'PUBLISHED'
      AND (
        1 - (dc."embedding" <=> ${vectorValue}::vector(1024))
      ) >= ${minSimilarity}
    ORDER BY
      dc."embedding" <=> ${vectorValue}::vector(1024)
    LIMIT ${limit}
  `;

    return rows;
  }
}
