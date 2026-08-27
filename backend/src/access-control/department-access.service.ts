import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { PermissionCode } from './types/permission-code';

@Injectable()
export class DepartmentAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPermission(
    userId: string,
    departmentId: string,
    requiredPermission: PermissionCode,
  ): Promise<boolean> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_departmentId: {
          userId,
          departmentId,
        },
      },

      select: {
        status: true,

        department: {
          select: {
            organizationId: true,

            organization: {
              select: {
                status: true,
              },
            },
          },
        },

        user: {
          select: {
            organizationId: true,
          },
        },

        roles: {
          where: {
            role: {
              permissions: {
                some: { permission: { code: requiredPermission } },
              },
            },
          },
          select: {
            role: { select: { organizationId: true } },
          },
        },
      },
    });

    if (!membership) {
      return false;
    }

    if (membership.status !== 'ACTIVE') {
      return false;
    }

    if (membership.department.organization.status !== 'ACTIVE') {
      return false;
    }

    /*
     * 防御性租户校验：
     *
     * User、Department、Role 必须属于同一个企业。
     * 当前数据库外键无法自动保证这三个 organizationId 一致，
     * 所以业务层必须校验。
     */
    const userOrganizationId = membership.user.organizationId;

    const departmentOrganizationId = membership.department.organizationId;

    if (
      userOrganizationId !== departmentOrganizationId ||
      membership.roles.some(
        ({ role }) => role.organizationId !== departmentOrganizationId,
      )
    ) {
      return false;
    }

    return membership.roles.length > 0;
  }

  async hasRole(
    userId: string,
    departmentId: string,
    roleName: 'DEPARTMENT_ADMIN' | 'DEPARTMENT_MEMBER',
  ): Promise<boolean> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        departmentId,
        status: 'ACTIVE',
        user: { status: 'ACTIVE' },
        department: { organization: { status: 'ACTIVE' } },
        roles: {
          some: {
            role: { name: roleName },
          },
        },
      },
      select: { id: true },
    });
    return Boolean(membership);
  }
}
