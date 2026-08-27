import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { DocumentIndexingService } from './document-indexing.service';

@Processor('document-processing')
export class DocumentProcessingProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indexingService: DocumentIndexingService,
  ) {
    super();
  }

  async process(job) {
    const { processId, documentId } = job.data;
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new Error('document not found');

    await this.prisma.$transaction([
      this.prisma.documentProcess.update({
        where: { id: processId },
        data: { status: 'PROCESSING', startedAt: new Date() },
      }),
      this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      }),
    ]);

    try {
      const result = await this.indexingService.rebuild(documentId);
      console.log('Document hierarchical index completed:', result);
      await this.prisma.$transaction([
        this.prisma.document.update({
          where: { id: documentId },
          data: { status: 'PARSED' },
        }),
        this.prisma.documentProcess.update({
          where: { id: processId },
          data: { status: 'SUCCESS', finishedAt: new Date() },
        }),
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown document processing error';
      await this.prisma.$transaction([
        this.prisma.documentProcess.update({
          where: { id: processId },
          data: { status: 'FAILED', errorMessage, finishedAt: new Date() },
        }),
        this.prisma.document.update({
          where: { id: documentId },
          data: { status: 'FAILED' },
        }),
      ]);
      throw error;
    }
  }
}
