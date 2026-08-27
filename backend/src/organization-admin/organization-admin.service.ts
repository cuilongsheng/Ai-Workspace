import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

const MEMBER_PERMISSION_CODES = [
  'knowledge_base.read',
  'document.read',
] as const;

const DEPARTMENT_ADMIN_PERMISSION_CODES = [
  'membership.read',
  'membership.create',
  'membership.update',
  'membership.delete',
  'role.read',
  'knowledge_base.read',
  'knowledge_base.create',
  'knowledge_base.update',
  'knowledge_base.archive',
  'document.read',
  'document.upload',
  'document.update',
  'document.review',
  'document.publish',
  'document.archive',
] as const;

@Injectable()
export class OrganizationAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true, organizationRole: true },
    });
    if (!user?.organizationId)
      throw new ForbiddenException('Organization context is required');
    return user;
  }

  private async requireOrganizationAdmin(userId: string) {
    const user = await this.getUser(userId);
    if (user.organizationRole !== 'ORGANIZATION_ADMIN')
      throw new ForbiddenException('Organization administrator is required');
    return user;
  }

  private async requireDepartmentAdmin(userId: string, departmentId: string) {
    const user = await this.getUser(userId);
    const organizationId = user.organizationId;
    if (!organizationId)
      throw new ForbiddenException('Organization context is required');
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId },
      select: { id: true },
    });
    if (!department) throw new NotFoundException('Department not found');
    if (user.organizationRole === 'ORGANIZATION_ADMIN') return user;
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        departmentId,
        status: 'ACTIVE',
        roles: { some: { role: { name: 'DEPARTMENT_ADMIN' } } },
      },
      select: { id: true },
    });
    if (!membership)
      throw new ForbiddenException('Department administrator is required');
    return user;
  }

  async departments(userId: string) {
    const user = await this.requireOrganizationAdmin(userId);
    return this.prisma.department.findMany({
      where: { organizationId: user.organizationId! },
      include: { _count: { select: { memberships: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createDepartment(userId: string, name: string, nameEn?: string) {
    const user = await this.requireOrganizationAdmin(userId);
    return this.prisma.department.create({
      data: {
        organizationId: user.organizationId!,
        name: name.trim(),
        nameEn: nameEn?.trim() || null,
      },
    });
  }

  async updateDepartment(
    userId: string,
    departmentId: string,
    name: string,
    nameEn?: string,
  ) {
    const user = await this.requireOrganizationAdmin(userId);
    const item = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId: user.organizationId! },
    });
    if (!item) throw new NotFoundException('Department not found');
    return this.prisma.department.update({
      where: { id: departmentId },
      data: { name: name.trim(), nameEn: nameEn?.trim() || null },
    });
  }

  async employees(userId: string, search?: string) {
    const user = await this.requireOrganizationAdmin(userId);
    const query = search?.trim();
    return this.prisma.user.findMany({
      where: {
        organizationId: user.organizationId!,
        id: { not: userId },
        organizationRole: null,
        platformRoleAssignments: { none: {} },
        ...(query
          ? {
              OR: [
                { email: { contains: query, mode: 'insensitive' } },
                { username: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
        organizationRole: true,
        createdAt: true,
        memberships: {
          select: {
            id: true,
            status: true,
            department: { select: { id: true, name: true, nameEn: true } },
            roles: { select: { role: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createEmployee(
    userId: string,
    email: string,
    username: string | undefined,
    password: string,
    organizationAdmin = false,
    departmentId?: string,
    roleIds?: string[],
  ) {
    const current = await this.requireOrganizationAdmin(userId);
    const normalizedEmail = email.trim().toLowerCase();
    const effectiveRoleIds = [...new Set(roleIds ?? [])];
    if (
      await this.prisma.user.findUnique({ where: { email: normalizedEmail } })
    )
      throw new ConflictException('User already exists');
    if (Boolean(departmentId) !== Boolean(effectiveRoleIds.length))
      throw new BadRequestException(
        'departmentId and roleIds must be provided together',
      );

    if (departmentId && effectiveRoleIds.length) {
      const [department, departmentRoles] = await Promise.all([
        this.prisma.department.findFirst({
          where: { id: departmentId, organizationId: current.organizationId! },
          select: { id: true },
        }),
        this.prisma.role.findMany({
          where: {
            id: { in: effectiveRoleIds },
            organizationId: current.organizationId!,
            name: { in: ['DEPARTMENT_ADMIN', 'DEPARTMENT_MEMBER'] },
          },
          select: { id: true },
        }),
      ]);
      if (!department) throw new NotFoundException('Department not found');
      if (departmentRoles.length !== effectiveRoleIds.length)
        throw new NotFoundException(
          'One or more department roles were not found',
        );
    }

    return this.prisma.user.create({
      data: {
        email: normalizedEmail,
        username: username?.trim() || null,
        passwordHash: await argon2.hash(password),
        organizationId: current.organizationId!,
        organizationRole: organizationAdmin ? 'ORGANIZATION_ADMIN' : null,
        status: 'ACTIVE',
        ...(departmentId && effectiveRoleIds.length
          ? {
              memberships: {
                create: {
                  departmentId,
                  status: 'ACTIVE',
                  roles: {
                    create: effectiveRoleIds.map((roleId) => ({ roleId })),
                  },
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
        organizationRole: true,
        createdAt: true,
        memberships: {
          select: {
            id: true,
            status: true,
            department: { select: { id: true, name: true, nameEn: true } },
            roles: { select: { role: { select: { id: true, name: true } } } },
          },
        },
      },
    });
  }

  async updateEmployee(
    userId: string,
    employeeId: string,
    input: {
      username?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
      organizationAdmin?: boolean;
    },
  ) {
    const current = await this.requireOrganizationAdmin(userId);
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, organizationId: current.organizationId! },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employeeId === userId && input.status && input.status !== 'ACTIVE')
      throw new ConflictException('You cannot disable your own account');
    if (employeeId === userId && input.organizationAdmin === false)
      throw new ConflictException(
        'You cannot remove your own organization administrator role',
      );
    return this.prisma.user.update({
      where: { id: employeeId },
      data: {
        ...(input.username !== undefined
          ? { username: input.username.trim() || null }
          : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.organizationAdmin !== undefined
          ? {
              organizationRole: input.organizationAdmin
                ? 'ORGANIZATION_ADMIN'
                : null,
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
        organizationRole: true,
        createdAt: true,
      },
    });
  }

  async removeEmployee(userId: string, employeeId: string) {
    const current = await this.requireOrganizationAdmin(userId);
    if (employeeId === userId)
      throw new ConflictException('You cannot remove your own account');
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, organizationId: current.organizationId! },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    await this.prisma.$transaction([
      this.prisma.membership.deleteMany({ where: { userId: employeeId } }),
      this.prisma.user.update({
        where: { id: employeeId },
        data: {
          organizationId: null,
          organizationRole: null,
          status: 'INACTIVE',
        },
      }),
    ]);
  }

  async roles(userId: string) {
    const user = await this.getUser(userId);
    await this.ensureDefaultDepartmentRoles(user.organizationId!);
    return this.prisma.role.findMany({
      where: {
        organizationId: user.organizationId!,
        name: { in: ['DEPARTMENT_ADMIN', 'DEPARTMENT_MEMBER'] },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  private async ensureDefaultDepartmentRoles(organizationId: string) {
    await this.prisma.$transaction(async (tx) => {
      const [adminRole, memberRole] = await Promise.all([
        tx.role.upsert({
          where: {
            organizationId_name: {
              organizationId,
              name: 'DEPARTMENT_ADMIN',
            },
          },
          update: {},
          create: { organizationId, name: 'DEPARTMENT_ADMIN' },
        }),
        tx.role.upsert({
          where: {
            organizationId_name: {
              organizationId,
              name: 'DEPARTMENT_MEMBER',
            },
          },
          update: {},
          create: { organizationId, name: 'DEPARTMENT_MEMBER' },
        }),
      ]);
      const permissions = await tx.permission.findMany({
        where: {
          code: {
            in: [
              ...new Set([
                ...DEPARTMENT_ADMIN_PERMISSION_CODES,
                ...MEMBER_PERMISSION_CODES,
              ]),
            ],
          },
        },
        select: { id: true, code: true },
      });
      await tx.rolePermission.createMany({
        data: permissions.flatMap((permission) => {
          const assignments: Array<{
            roleId: string;
            permissionId: string;
          }> = [];
          if (
            DEPARTMENT_ADMIN_PERMISSION_CODES.includes(
              permission.code as (typeof DEPARTMENT_ADMIN_PERMISSION_CODES)[number],
            )
          )
            assignments.push({
              roleId: adminRole.id,
              permissionId: permission.id,
            });
          if (
            MEMBER_PERMISSION_CODES.includes(
              permission.code as (typeof MEMBER_PERMISSION_CODES)[number],
            )
          )
            assignments.push({
              roleId: memberRole.id,
              permissionId: permission.id,
            });
          return assignments;
        }),
        skipDuplicates: true,
      });
    });
  }

  async members(userId: string, departmentId: string) {
    await this.requireDepartmentAdmin(userId, departmentId);
    return this.prisma.membership.findMany({
      where: {
        departmentId,
        userId: { not: userId },
        user: {
          organizationRole: null,
          platformRoleAssignments: { none: {} },
        },
      },
      include: {
        user: {
          select: { id: true, email: true, username: true, status: true },
        },
        department: { select: { id: true, name: true, nameEn: true } },
        roles: { select: { role: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async employeeOptions(userId: string, departmentId: string, search?: string) {
    const current = await this.requireDepartmentAdmin(userId, departmentId);
    const query = search?.trim();
    return this.prisma.user.findMany({
      where: {
        organizationId: current.organizationId!,
        status: 'ACTIVE',
        organizationRole: null,
        platformRoleAssignments: { none: {} },
        memberships: { none: { departmentId } },
        ...(query
          ? {
              OR: [
                { email: { contains: query, mode: 'insensitive' } },
                { username: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
        organizationRole: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
  }

  async assignMember(
    userId: string,
    departmentId: string,
    employeeId: string,
    roleIds: string[],
  ) {
    const current = await this.requireDepartmentAdmin(userId, departmentId);
    const effectiveRoleIds = [...new Set(roleIds)];
    if (!effectiveRoleIds.length)
      throw new BadRequestException('At least one department role is required');
    const [employee, roles] = await Promise.all([
      this.prisma.user.findFirst({
        where: {
          id: employeeId,
          organizationId: current.organizationId!,
          status: 'ACTIVE',
          organizationRole: null,
          platformRoleAssignments: { none: {} },
        },
      }),
      this.prisma.role.findMany({
        where: {
          id: { in: effectiveRoleIds },
          organizationId: current.organizationId!,
          name: { in: ['DEPARTMENT_ADMIN', 'DEPARTMENT_MEMBER'] },
        },
        select: { id: true, name: true },
      }),
    ]);
    if (!employee) throw new NotFoundException('Employee not found');
    if (roles.length !== effectiveRoleIds.length)
      throw new NotFoundException(
        'One or more department roles were not found',
      );
    if (
      employeeId === userId &&
      !roles.some((role) => role.name === 'DEPARTMENT_ADMIN')
    )
      throw new ConflictException(
        'You cannot remove your own department administrator role',
      );

    const membership = await this.prisma.$transaction(async (tx) => {
      const item = await tx.membership.upsert({
        where: { userId_departmentId: { userId: employeeId, departmentId } },
        update: { status: 'ACTIVE' },
        create: { userId: employeeId, departmentId, status: 'ACTIVE' },
      });
      await tx.membershipRole.deleteMany({ where: { membershipId: item.id } });
      await tx.membershipRole.createMany({
        data: effectiveRoleIds.map((roleId) => ({
          membershipId: item.id,
          roleId,
        })),
      });
      return item;
    });
    return this.getMember(membership.id);
  }

  async removeMember(
    userId: string,
    departmentId: string,
    membershipId: string,
  ) {
    await this.requireDepartmentAdmin(userId, departmentId);
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, departmentId },
      select: { id: true, userId: true },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    if (membership.userId === userId)
      throw new ConflictException('You cannot remove your own membership');
    await this.prisma.membership.delete({ where: { id: membershipId } });
  }

  async updateMember(
    userId: string,
    departmentId: string,
    membershipId: string,
    employeeId: string,
    roleIds: string[],
  ) {
    await this.requireDepartmentAdmin(userId, departmentId);
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, departmentId, userId: employeeId },
      select: { id: true },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    return this.assignMember(userId, departmentId, employeeId, roleIds);
  }

  private async getMember(membershipId: string) {
    return this.prisma.membership.findUniqueOrThrow({
      where: { id: membershipId },
      include: {
        user: {
          select: { id: true, email: true, username: true, status: true },
        },
        department: { select: { id: true, name: true, nameEn: true } },
        roles: { select: { role: { select: { id: true, name: true } } } },
      },
    });
  }
}
