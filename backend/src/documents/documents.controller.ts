import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { CreateDocumentDto } from './dto/create.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ResourcePermissionGuard } from 'src/access-control/guards/resource-permission.guard';
import { RequirePermission } from 'src/access-control/decorators/require-permission.decorator';
import { ListDocumentsDto } from './dto/list.dto';
import { DocumentsService } from './documents.service';
import { ResourcePermission } from 'src/access-control/decorators/resource-permission.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UpdateDocumentDto } from './dto/update.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { CreateDocumentChunkDto } from './dto/create-chunk.dto';
import { UpdateDocumentChunkDto } from './dto/update-chunk.dto';

@Controller('knowledge-bases/:knowledgeBaseId/documents')
@ApiTags('Documents')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, ResourcePermissionGuard)
export class KnowledgeBaseDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @RequirePermission('document.upload')
  @ResourcePermission('knowledgeBase')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'name'],
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  uploadDocument(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() currentUser,
  ) {
    return this.documentsService.uploadDocument(
      knowledgeBaseId,
      file,
      dto,
      currentUser,
    );
  }

  @Get()
  @RequirePermission('document.read')
  @ResourcePermission('knowledgeBase')
  getDocuments(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Query() dto: ListDocumentsDto,
  ) {
    return this.documentsService.getDocuments(knowledgeBaseId, dto);
  }
}

@Controller('documents')
@ApiTags('Documents')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, ResourcePermissionGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':documentId')
  @RequirePermission('document.read')
  @ResourcePermission('document')
  getDocumentById(@Param('documentId') documentId: string) {
    return this.documentsService.getDocumentById(documentId);
  }

  @Patch(':documentId')
  @RequirePermission('document.update')
  @ResourcePermission('document')
  updateDocument(
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(documentId, dto);
  }

  @Delete(':documentId')
  @RequirePermission('document.archive')
  @ResourcePermission('document')
  archiveDocument(@Param('documentId') documentId: string) {
    return this.documentsService.archiveDocument(documentId);
  }

  @Get(':documentId/download')
  @ApiProduces('application/octet-stream')
  @RequirePermission('document.read')
  @ResourcePermission('document')
  async download(
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    const file = await this.documentsService.downloadDocument(documentId);

    res.set({
      'Content-Type': file.contentType,
      'Content-Length': String(file.size),
    });

    file.stream.pipe(res);
  }

  @Post(':documentId/reprocess')
  @RequirePermission('document.update')
  @ResourcePermission('document')
  reprocessDocument(@Param('documentId') documentId: string) {
    return this.documentsService.reprocessDocument(documentId);
  }

  @Get(':documentId/chunks')
  @RequirePermission('document.read')
  @ResourcePermission('document')
  getChunks(@Param('documentId') documentId: string) {
    return this.documentsService.getDocumentChunks(documentId);
  }

  @Post(':documentId/chunks')
  @RequirePermission('document.review')
  @ResourcePermission('document')
  createChunk(
    @Param('documentId') documentId: string,
    @Body() dto: CreateDocumentChunkDto,
  ) {
    return this.documentsService.createDocumentChunk(documentId, dto);
  }

  @Post(':documentId/review')
  @RequirePermission('document.review')
  @ResourcePermission('document')
  startReview(@Param('documentId') documentId: string) {
    return this.documentsService.startDocumentReview(documentId);
  }

  @Post(':documentId/publish')
  @RequirePermission('document.publish')
  @ResourcePermission('document')
  publish(@Param('documentId') documentId: string) {
    return this.documentsService.publishDocument(documentId);
  }

  @Get(':documentId/preview')
  @ApiProduces('application/octet-stream')
  @RequirePermission('document.read')
  @ResourcePermission('document')
  async preview(@Param('documentId') documentId: string, @Res() res: Response) {
    const file = await this.documentsService.downloadDocument(documentId);
    res.set({
      'Content-Type': file.contentType,
      'Content-Length': String(file.size),
      'Content-Disposition': 'inline',
    });
    file.stream.pipe(res);
  }

  @Get(':documentId/preview-content')
  @RequirePermission('document.read')
  @ResourcePermission('document')
  previewContent(@Param('documentId') documentId: string) {
    return this.documentsService.getDocumentPreviewContent(documentId);
  }
}

@Controller('document-chunks')
@ApiTags('Documents')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, ResourcePermissionGuard)
export class DocumentChunksController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Patch(':chunkId')
  @RequirePermission('document.review')
  @ResourcePermission('documentChunk')
  update(
    @Param('chunkId') chunkId: string,
    @Body() dto: UpdateDocumentChunkDto,
  ) {
    return this.documentsService.updateDocumentChunk(chunkId, dto);
  }

  @Delete(':chunkId')
  @RequirePermission('document.review')
  @ResourcePermission('documentChunk')
  remove(@Param('chunkId') chunkId: string) {
    return this.documentsService.deleteDocumentChunk(chunkId);
  }
}
