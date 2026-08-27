import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ResourcePermissionGuard } from 'src/access-control/guards/resource-permission.guard';
import { RequirePermission } from 'src/access-control/decorators/require-permission.decorator';
import { ResourcePermission } from 'src/access-control/decorators/resource-permission.decorator';

import { RetrievalService } from './retrieval.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RetrievalDebugDto } from './dto/retrieval-debug.dto';

@Controller('knowledge-bases/:knowledgeBaseId/search')
@ApiTags('Retrieval')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, ResourcePermissionGuard)
export class RetrievalController {
  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @RequirePermission('document.read')
  @ResourcePermission('knowledgeBase')
  async search(
    @Param('knowledgeBaseId')
    knowledgeBaseId: string,

    @Query('q')
    query: string,
  ) {
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: {
        id: knowledgeBaseId,
      },
      select: {
        id: true,
        organizationId: true,
        departmentId: true,
      },
    });

    if (!knowledgeBase) {
      return [];
    }

    return this.retrievalService.search(
      query,
      {
        organizationId: knowledgeBase.organizationId,

        departmentId: knowledgeBase.departmentId,

        knowledgeBaseId: knowledgeBase.id,
      },
      {
        limit: 5,
      },
    );
  }
}

@Controller(
  'departments/:departmentId/knowledge-bases/:knowledgeBaseId/retrieval-debug',
)
@ApiTags('Retrieval')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, ResourcePermissionGuard)
export class RetrievalDebugController {
  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @RequirePermission('document.review')
  @ResourcePermission('knowledgeBase')
  async debug(
    @Param('departmentId') departmentId: string,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Body() dto: RetrievalDebugDto,
  ) {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: { id: knowledgeBaseId, departmentId, status: 'ACTIVE' },
      select: { id: true, organizationId: true, departmentId: true },
    });
    if (!knowledgeBase) return { status: 'no_match', diagnostics: null };
    const outcome = await this.retrievalService.searchDetailed(dto.query, {
      organizationId: knowledgeBase.organizationId,
      departmentId: knowledgeBase.departmentId,
      knowledgeBaseId: knowledgeBase.id,
    });
    return {
      status: outcome.status,
      diagnostics: outcome.diagnostics,
    };
  }
}
