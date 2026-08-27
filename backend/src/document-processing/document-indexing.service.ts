import { Injectable, NotFoundException } from '@nestjs/common';
import { EmbeddingsService } from 'src/embeddings/embeddings.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from 'src/storage/storage.service';
import {
  DOCUMENT_INDEX_VERSION,
  DocumentChunkerService,
} from './chunking/document-chunker.service';
import { DocumentParserService } from './parser/document-parser.service';

@Injectable()
export class DocumentIndexingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly parserService: DocumentParserService,
    private readonly chunkerService: DocumentChunkerService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async rebuild(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException('Document not found');

    const buffer = await this.storageService.getFileBuffer(document.storageKey);
    const parsed = await this.parserService.parse(document.mimeType, buffer);
    const chunks = this.chunkerService.chunk(parsed.text);
    if (!chunks.length) {
      throw new Error('Document parsing produced no usable content');
    }

    const embeddings = await this.embeddingsService.embedMany(
      chunks.map((chunk) => this.chunkerService.embeddingText(chunk)),
    );
    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Chunk/embedding count mismatch: chunks=${chunks.length}, embeddings=${embeddings.length}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Referenced legacy chunks cannot be deleted because citations keep a
      // historical relation. They are deactivated and excluded from retrieval.
      await tx.documentChunk.updateMany({
        where: { documentId },
        data: { isActive: false },
      });

      for (const [position, chunk] of chunks.entries()) {
        const row = await tx.documentChunk.upsert({
          where: {
            documentId_chunkIndex: {
              documentId,
              chunkIndex: chunk.index,
            },
          },
          create: {
            documentId,
            organizationId: document.organizationId,
            departmentId: document.departmentId,
            knowledgeBaseId: document.knowledgeBaseId,
            chunkIndex: chunk.index,
            sectionIndex: chunk.sectionIndex,
            sectionTitle: chunk.sectionTitle,
            chunkInSection: chunk.chunkInSection,
            content: chunk.content,
            charCount: chunk.charCount,
            isActive: true,
            indexVersion: DOCUMENT_INDEX_VERSION,
            metadata: {
              startOffset: chunk.startOffset,
              endOffset: chunk.endOffset,
              sectionStartOffset: chunk.sectionStartOffset,
              sectionEndOffset: chunk.sectionEndOffset,
            },
          },
          update: {
            sectionIndex: chunk.sectionIndex,
            sectionTitle: chunk.sectionTitle,
            chunkInSection: chunk.chunkInSection,
            content: chunk.content,
            charCount: chunk.charCount,
            isActive: true,
            indexVersion: DOCUMENT_INDEX_VERSION,
            metadata: {
              startOffset: chunk.startOffset,
              endOffset: chunk.endOffset,
              sectionStartOffset: chunk.sectionStartOffset,
              sectionEndOffset: chunk.sectionEndOffset,
            },
          },
          select: { id: true },
        });

        const embedding = embeddings[position];
        const vectorValue = `[${embedding.vector.join(',')}]`;
        await tx.$executeRaw`
          UPDATE "DocumentChunk"
          SET
            "embedding" = ${vectorValue}::vector,
            "embeddingModel" = ${embedding.model},
            "updatedAt" = NOW()
          WHERE "id" = ${row.id}
        `;
      }

      await tx.document.update({
        where: { id: documentId },
        data: { extractedText: parsed.text },
      });
    });

    return {
      documentId,
      chunkCount: chunks.length,
      sectionCount: new Set(chunks.map((chunk) => chunk.sectionIndex)).size,
      indexVersion: DOCUMENT_INDEX_VERSION,
    };
  }
}
