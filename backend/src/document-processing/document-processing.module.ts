import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DocumentProcessingService } from './document-processing.service';
import { DocumentProcessingProcessor } from './document-processing.processor';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PdfParser } from './parser/pdf.parser';
import {
  DOCUMENT_PARSERS,
  DocumentParserService,
} from './parser/document-parser.service';
import { StorageModule } from 'src/storage/storage.module';
import { DocxParser } from './parser/docx.parser';
import { MarkdownParser } from './parser/markdown.parser';
import { DocumentChunkerService } from './chunking/document-chunker.service';
import { EmbeddingsModule } from 'src/embeddings/embeddings.module';
import { DocumentIndexingService } from './document-indexing.service';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    EmbeddingsModule,
    BullModule.registerQueue({
      name: 'document-processing',
    }),
  ],
  providers: [
    DocumentProcessingService,
    DocumentProcessingProcessor,
    PdfParser,
    DocxParser,
    MarkdownParser,
    DocumentParserService,
    {
      provide: DOCUMENT_PARSERS,
      useFactory: (
        pdfParser: PdfParser,
        docxParser: DocxParser,
        markdownParser: MarkdownParser,
      ) => [pdfParser, docxParser, markdownParser],
      inject: [PdfParser, DocxParser, MarkdownParser],
    },
    DocumentChunkerService,
    DocumentIndexingService,
  ],
  exports: [
    DocumentProcessingService,
    DocumentParserService,
    DocumentChunkerService,
    DocumentIndexingService,
  ],
})
export class DocumentProcessingModule {}
