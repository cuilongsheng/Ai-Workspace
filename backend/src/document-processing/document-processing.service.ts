import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DocumentParser } from './parser/parser.interface';

@Injectable()
export class DocumentProcessingService {
  constructor(
    private readonly prisma: PrismaService,

    @InjectQueue('document-processing')
    private queue: Queue,
  ) {}

  async createProcess(documentId: string) {
    const process = await this.prisma.documentProcess.create({
      data: {
        documentId,
      },
    });
    await this.queue.add('process-document', {
      processId: process.id,
      documentId,
    });
    return process;
  }
}
