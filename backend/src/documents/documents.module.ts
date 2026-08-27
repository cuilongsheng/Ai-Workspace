import { Module } from '@nestjs/common';
import {
  DocumentChunksController,
  DocumentsController,
  KnowledgeBaseDocumentsController,
} from './documents.controller';
import { DocumentsService } from './documents.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { AccessControlModule } from 'src/access-control/access-control.module';
import { DepartmentsModule } from 'src/departments/departments.module';
import { StorageModule } from 'src/storage/storage.module';
import { DocumentProcessingModule } from 'src/document-processing/document-processing.module';
import { EmbeddingsModule } from 'src/embeddings/embeddings.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AccessControlModule,
    DepartmentsModule,
    StorageModule,
    DocumentProcessingModule,
    EmbeddingsModule,
  ],
  controllers: [
    DocumentsController,
    DocumentChunksController,
    KnowledgeBaseDocumentsController,
  ],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
