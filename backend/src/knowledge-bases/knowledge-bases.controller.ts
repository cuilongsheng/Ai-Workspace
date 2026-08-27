import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KnowledgeBaseService } from './knowledge-bases.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { RequirePermission } from 'src/access-control/decorators/require-permission.decorator';
import { ResourcePermissionGuard } from 'src/access-control/guards/resource-permission.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ListKnowledgeBaseDto } from './dto/list-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import { ResourcePermission } from 'src/access-control/decorators/resource-permission.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateStarterQuestionsDto } from './dto/update-starter-questions.dto';

@Controller('departments/:departmentId/knowledge-bases')
@ApiTags('Knowledge Bases')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, ResourcePermissionGuard)
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Post()
  @RequirePermission('knowledge_base.create')
  @ResourcePermission('department')
  createKnowledgeBase(
    @CurrentUser() currentUser,
    @Param('departmentId') departmentId: string,
    @Body() dto: CreateKnowledgeBaseDto,
  ) {
    return this.knowledgeBaseService.createKnowledgeBase(
      dto,
      currentUser,
      departmentId,
    );
  }

  @Get()
  @RequirePermission('knowledge_base.read')
  @ResourcePermission('department')
  listKnowledgeBase(
    @Param('departmentId') departmentId: string,
    @Query() dto: ListKnowledgeBaseDto,
  ) {
    return this.knowledgeBaseService.listKnowledgeBase(dto, departmentId);
  }

  @Get(':knowledgeBaseId')
  @RequirePermission('knowledge_base.read')
  @ResourcePermission('knowledgeBase')
  getKnowledgeBaseById(
    @Param('departmentId') departmentId: string,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
  ) {
    return this.knowledgeBaseService.getKnowledgeBaseById(
      departmentId,
      knowledgeBaseId,
    );
  }

  @Get(':knowledgeBaseId/starter-questions')
  @RequirePermission('knowledge_base.read')
  @ResourcePermission('knowledgeBase')
  getStarterQuestions(
    @Param('departmentId') departmentId: string,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
  ) {
    return this.knowledgeBaseService.getStarterQuestions(
      departmentId,
      knowledgeBaseId,
    );
  }

  @Get(':knowledgeBaseId/readiness')
  @RequirePermission('knowledge_base.read')
  @ResourcePermission('knowledgeBase')
  getReadiness(
    @Param('departmentId') departmentId: string,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
  ) {
    return this.knowledgeBaseService.getReadiness(
      departmentId,
      knowledgeBaseId,
    );
  }

  @Patch(':knowledgeBaseId')
  @ResourcePermission('knowledgeBase')
  @RequirePermission('knowledge_base.update')
  updateKnowledgeBase(
    @Param('departmentId') departmentId: string,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Body() dto: UpdateKnowledgeBaseDto,
  ) {
    return this.knowledgeBaseService.updateKnowledgeBase(
      departmentId,
      knowledgeBaseId,
      dto,
    );
  }

  @Patch(':knowledgeBaseId/starter-questions')
  @RequirePermission('knowledge_base.update')
  @ResourcePermission('knowledgeBase')
  updateStarterQuestions(
    @Param('departmentId') departmentId: string,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Body() dto: UpdateStarterQuestionsDto,
  ) {
    return this.knowledgeBaseService.updateStarterQuestions(
      departmentId,
      knowledgeBaseId,
      dto.questions,
    );
  }

  @Patch(':knowledgeBaseId/archive')
  @RequirePermission('knowledge_base.archive')
  @ResourcePermission('knowledgeBase')
  archiveKnowledgeBase(
    @Param('departmentId') departmentId: string,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
  ) {
    return this.knowledgeBaseService.archiveKnowledgeBase(
      departmentId,
      knowledgeBaseId,
    );
  }
}
