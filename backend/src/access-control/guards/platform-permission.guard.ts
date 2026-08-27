import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthUser } from '../../auth/types/auth-user';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRED_PLATFORM_PERMISSION_KEY } from '../decorators/require-platform-permission.decorator';
import type { PermissionCode } from '../types/permission-code';

@Injectable()
export class PlatformPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<
      PermissionCode | undefined
    >(REQUIRED_PLATFORM_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) return true;
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!request.user?.id)
      throw new UnauthorizedException('Authenticated user is missing');
    const assignment = await this.prisma.platformRoleAssignment.findFirst({
      where: {
        userId: request.user.id,
        role: {
          code: 'PLATFORM_ADMIN',
          permissions: { some: { permission: { code: permission } } },
        },
      },
      select: { roleId: true },
    });
    if (!assignment)
      throw new ForbiddenException(
        `Missing platform permission: ${permission}`,
      );
    return true;
  }
}
