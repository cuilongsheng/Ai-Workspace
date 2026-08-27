import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { RequirePermission } from '../access-control/decorators/require-permission.decorator';
import { ResourcePermissionGuard } from '../access-control/guards/resource-permission.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { ResourcePermission } from 'src/access-control/decorators/resource-permission.decorator';
import { ApiExcludeController } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';

@Controller('departments')
@ApiExcludeController()
@ResourcePermission('department')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Get(':departmentId/access-test')
  @RequirePermission('document.read')
  @UseGuards(JwtAuthGuard, ResourcePermissionGuard)
  accessTest(
    @Param('departmentId') departmentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return {
      allowed: true,
      userId: user.id,
      departmentId,
      permission: 'document.read',
    };
  }

  @Get(':departmentId/knowledge-base')
  getKnowledgeBase(@Param('departmentId') departmentId: string) {
    return {
      departmentId,
    };
  }
}
