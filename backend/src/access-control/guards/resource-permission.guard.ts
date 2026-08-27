import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import type { AuthUser } from '../../auth/types/auth-user';

import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator';

import { RESOURCE_PERMISSION_KEY } from '../decorators/resource-permission.decorator';

import type { ResourcePermissionMetadata } from '../decorators/resource-permission.decorator';

import type { PermissionCode } from '../types/permission-code';

import { DepartmentAccessService } from '../department-access.service';

import { PrismaService } from 'src/prisma/prisma.service';

interface RequestContext {
  user?: AuthUser;
  params?: Record<string, string | undefined>;
}

/**
 * JwtAuthGuard：你是谁？
 * ResourcePermission：这次操作属于哪个部门？
 * RequirePermission：你需要什么权限？
 * ResourcePermissionGuard：你在这个部门有没有该权限？
 */

@Injectable()
export class ResourcePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly departmentAccessService: DepartmentAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    /**
     * 1. 获取接口要求权限
     */
    const requiredPermission = this.reflector.getAllAndOverride<
      PermissionCode | undefined
    >(REQUIRED_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    /**
     * 没有声明权限直接通过
     */
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestContext>();
    const userId = request.user?.id;

    if (!userId) {
      // 没有登录，或者登录身份无效
      throw new UnauthorizedException('Authenticated user is missing');
    }

    /**
     * 2. 获取资源类型
     */

    const resourceMetadata = this.reflector.getAllAndOverride<
      ResourcePermissionMetadata | undefined
    >(RESOURCE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    /**
     * 3. 根据资源找到 departmentId
     */

    const departmentId = await this.resolveDepartmentId(
      request,
      resourceMetadata,
    );

    if (!departmentId) {
      throw new ForbiddenException('Department context is missing');
    }

    /**
     * 4. 权限校验
     */

    const allowed = await this.departmentAccessService.hasPermission(
      userId,
      departmentId,
      requiredPermission,
    );

    if (!allowed) {
      throw new ForbiddenException(`Missing permission: ${requiredPermission}`);
    }

    return true;
  }

  private async resolveDepartmentId(
    request: RequestContext,
    metadata?: ResourcePermissionMetadata,
  ): Promise<string | undefined> {
    /**
     * 默认兼容旧接口
     *
     * /departments/:departmentId/*
     */
    if (!metadata) {
      return request.params?.departmentId;
    }

    const resourceId = request.params?.[metadata.param];

    if (!resourceId) {
      return undefined;
    }

    switch (metadata.resource) {
      case 'department':
        return resourceId;

      case 'knowledgeBase': {
        const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
          where: {
            id: resourceId,
          },
          select: {
            departmentId: true,
          },
        });

        if (!knowledgeBase) {
          throw new NotFoundException('Knowledge base not found');
        }
        return knowledgeBase.departmentId;
      }
      case 'document': {
        const document = await this.prisma.document.findUnique({
          where: {
            id: resourceId,
          },
          select: {
            departmentId: true,
          },
        });

        if (!document) {
          throw new NotFoundException('Document not found');
        }

        return document.departmentId;
      }
      case 'documentChunk': {
        const chunk = await this.prisma.documentChunk.findUnique({
          where: { id: resourceId },
          select: { departmentId: true },
        });

        if (!chunk) {
          throw new NotFoundException('Document chunk not found');
        }

        return chunk.departmentId;
      }
      default:
        return undefined;
    }
  }
}
