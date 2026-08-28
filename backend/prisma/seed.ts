import 'dotenv/config';

import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured.');
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === 'production'
      ? ['error']
      : ['query', 'warn', 'error'],
});

/**
 * 固定初始化 ID。
 *
 * Seed 重复执行时，始终操作同一批业务数据，
 * 不会因为 cuid() 每次不同而重复创建。
 */
const SEED_IDS = {
  organization: 'org_demo_001',

  departments: {
    technology: 'department_technology_001',
    aiInnovation: 'department_ai_innovation_001',
  },

  roles: {
    admin: 'role_department_admin_001',
    member: 'role_department_member_001',
  },

  users: {
    admin: 'user_admin_001',
    organizationAdmin: 'user_organization_admin_001',
    departmentAdmin: 'user_department_admin_001',
    departmentMember: 'user_department_member_001',
  },
  platformRole: 'platform_role_admin_001',
} as const;

const PERMISSIONS = [
  {
    code: 'organization.read',
    name: '查看企业信息',
    description: '允许查看当前企业的基本信息',
  },
  {
    code: 'organization.create',
    name: '创建企业',
    description: '允许在平台创建企业租户',
  },
  {
    code: 'organization.update',
    name: '修改企业信息',
    description: '允许修改当前企业的基本信息',
  },
  {
    code: 'organization.disable',
    name: '停用企业',
    description: '允许在平台停用企业租户',
  },

  {
    code: 'department.read',
    name: '查看部门',
    description: '允许查看授权范围内的部门',
  },
  {
    code: 'department.create',
    name: '创建部门',
    description: '允许在企业内创建部门',
  },
  {
    code: 'department.update',
    name: '修改部门',
    description: '允许修改部门信息',
  },
  {
    code: 'department.delete',
    name: '删除部门',
    description: '允许删除部门',
  },

  {
    code: 'membership.read',
    name: '查看部门成员',
    description: '允许查看部门成员列表',
  },
  {
    code: 'membership.create',
    name: '添加部门成员',
    description: '允许将用户加入部门',
  },
  {
    code: 'membership.update',
    name: '修改成员关系',
    description: '允许修改成员角色或状态',
  },
  {
    code: 'membership.delete',
    name: '移除部门成员',
    description: '允许将用户移出部门',
  },

  {
    code: 'role.read',
    name: '查看角色',
    description: '允许查看企业角色及其权限',
  },
  {
    code: 'role.manage',
    name: '管理角色',
    description: '允许创建、修改、删除角色及分配权限',
  },

  /**
   * 下一阶段知识库会使用这些权限。
   * 现在先初始化权限定义，暂不实现 Document 业务。
   */
  {
    code: 'knowledge_base.read',
    name: '查看知识库',
    description: '允许查看部门知识库列表和详情',
  },
  {
    code: 'knowledge_base.create',
    name: '创建知识库',
    description: '允许在部门内创建知识库',
  },
  {
    code: 'knowledge_base.update',
    name: '修改知识库',
    description: '允许修改知识库名称和描述',
  },
  {
    code: 'knowledge_base.archive',
    name: '归档知识库',
    description: '允许归档和恢复知识库',
  },
  {
    code: 'document.read',
    name: '查看文档',
    description: '允许查看和检索部门知识库文档',
  },
  {
    code: 'document.upload',
    name: '上传文档',
    description: '允许向部门知识库上传文档',
  },
  {
    code: 'document.update',
    name: '修改文档',
    description: '允许修改文档名称和描述',
  },
  {
    code: 'document.review',
    name: '审核文档',
    description: '允许审核文档解析结果及发布内容',
  },
  {
    code: 'document.publish',
    name: '发布文档',
    description: '允许将审核通过的文档发布到知识库',
  },
  {
    code: 'document.archive',
    name: '归档文档',
    description: '允许归档知识库文档',
  },
] as const;

/** 普通成员可读取本部门知识库和已发布文档，但没有任何管理权限。 */
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

function getRequiredSeedValue(
  key: 'SEED_ADMIN_EMAIL' | 'SEED_ADMIN_USERNAME' | 'SEED_ADMIN_PASSWORD',
): string {
  const configuredValue = process.env[key]?.trim();

  if (configuredValue) {
    return configuredValue;
  }

  throw new Error(`${key} must be configured before running the seed.`);
}

async function main(): Promise<void> {
  console.log('Starting database seed...');

  const organizationName =
    process.env.SEED_ORGANIZATION_NAME?.trim() || 'XX科技有限公司';

  const adminEmail = getRequiredSeedValue('SEED_ADMIN_EMAIL');
  const adminUsername = getRequiredSeedValue('SEED_ADMIN_USERNAME');
  const adminPassword = getRequiredSeedValue('SEED_ADMIN_PASSWORD');

  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
  });

  await prisma.$transaction(async (tx) => {
    /**
     * 1. 企业
     */
    const organization = await tx.organization.upsert({
      where: {
        id: SEED_IDS.organization,
      },
      update: {
        name: organizationName,
        status: 'ACTIVE',
      },
      create: {
        id: SEED_IDS.organization,
        name: organizationName,
        status: 'ACTIVE',
      },
    });

    /**
     * 2. 部门
     */
    const technologyDepartment = await tx.department.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: '技术部',
        },
      },
      update: { nameEn: 'Technology Department' },
      create: {
        id: SEED_IDS.departments.technology,
        organizationId: organization.id,
        name: '技术部',
        nameEn: 'Technology Department',
      },
    });

    const aiInnovationDepartment = await tx.department.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: 'AI创新组',
        },
      },
      update: { nameEn: 'AI Innovation Group' },
      create: {
        id: SEED_IDS.departments.aiInnovation,
        organizationId: organization.id,
        name: 'AI创新组',
        nameEn: 'AI Innovation Group',
      },
    });

    /**
     * 3. 系统权限
     *
     * Permission.code 是全局唯一业务标识，
     * 所以使用 code 作为 upsert 条件。
     */
    const permissions = await Promise.all(
      PERMISSIONS.map((permission) =>
        tx.permission.upsert({
          where: {
            code: permission.code,
          },
          update: {
            name: permission.name,
            description: permission.description,
          },
          create: {
            code: permission.code,
            name: permission.name,
            description: permission.description,
          },
        }),
      ),
    );

    /**
     * 4. 企业角色
     *
     * Role 的唯一约束是：
     * organizationId + name
     */
    const adminRole = await tx.role.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: 'DEPARTMENT_ADMIN',
        },
      },
      update: {},
      create: {
        id: SEED_IDS.roles.admin,
        organizationId: organization.id,
        name: 'DEPARTMENT_ADMIN',
      },
    });

    const memberRole = await tx.role.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: 'DEPARTMENT_MEMBER',
        },
      },
      update: {},
      create: {
        id: SEED_IDS.roles.member,
        organizationId: organization.id,
        name: 'DEPARTMENT_MEMBER',
      },
    });

    /**
     * 5. 角色和权限绑定
     *
     * 部门管理员拥有全部当前权限。
     */
    const departmentAdminPermissions = permissions.filter((permission) =>
      DEPARTMENT_ADMIN_PERMISSION_CODES.includes(
        permission.code as (typeof DEPARTMENT_ADMIN_PERMISSION_CODES)[number],
      ),
    );
    await tx.rolePermission.deleteMany({
      where: {
        roleId: adminRole.id,
        permissionId: {
          notIn: departmentAdminPermissions.map((permission) => permission.id),
        },
      },
    });
    await Promise.all(
      departmentAdminPermissions.map((permission) =>
        tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        }),
      ),
    );

    /**
     * 普通成员只拥有读取权限。
     */
    const memberPermissions = permissions.filter((permission) =>
      MEMBER_PERMISSION_CODES.includes(
        permission.code as (typeof MEMBER_PERMISSION_CODES)[number],
      ),
    );

    await Promise.all(
      memberPermissions.map((permission) =>
        tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: memberRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: memberRole.id,
            permissionId: permission.id,
          },
        }),
      ),
    );

    /** 6. 平台角色 */
    const platformAdminRole = await tx.platformRole.upsert({
      where: { code: 'PLATFORM_ADMIN' },
      update: {},
      create: { id: SEED_IDS.platformRole, code: 'PLATFORM_ADMIN' },
    });
    const platformPermissions = permissions.filter((permission) =>
      [
        'organization.read',
        'organization.create',
        'organization.update',
        'organization.disable',
      ].includes(permission.code),
    );
    await tx.platformRolePermission.deleteMany({
      where: {
        roleId: platformAdminRole.id,
        permissionId: {
          notIn: platformPermissions.map((permission) => permission.id),
        },
      },
    });
    await Promise.all(
      platformPermissions.map((permission) =>
        tx.platformRolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: platformAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: { roleId: platformAdminRole.id, permissionId: permission.id },
        }),
      ),
    );
    /**
     * 7. 用于权限回归的独立账号。
     *
     * 不再用一个账号同时覆盖平台、组织和部门角色，避免前端或后端
     * 在权限判断时被超级权限掩盖问题。开发环境下它们共用 seed 密码，
     * 每次执行 seed 均会重置为该密码，便于重复验证。
     */
    /**
     * 产品演示入口：账号 admin 固定为平台管理员。
     * 它不属于任何企业或部门，也不会获得知识库、文档和聊天权限。
     */
    const adminUser = await tx.user.upsert({
      where: { id: SEED_IDS.users.admin },
      update: {
        organizationId: null,
        organizationRole: null,
        email: adminEmail,
        username: adminUsername,
        passwordHash,
        status: 'ACTIVE',
      },
      create: {
        id: SEED_IDS.users.admin,
        email: adminEmail,
        username: adminUsername,
        passwordHash,
        status: 'ACTIVE',
      },
    });

    const organizationAdminUser = await tx.user.upsert({
      where: { id: SEED_IDS.users.organizationAdmin },
      update: {
        organizationId: organization.id,
        organizationRole: 'ORGANIZATION_ADMIN',
        email: 'tenant@ai-workspace.local',
        username: 'tenant',
        passwordHash,
        status: 'ACTIVE',
      },
      create: {
        id: SEED_IDS.users.organizationAdmin,
        organizationId: organization.id,
        organizationRole: 'ORGANIZATION_ADMIN',
        email: 'tenant@ai-workspace.local',
        username: 'tenant',
        passwordHash,
        status: 'ACTIVE',
      },
    });

    const departmentAdminUser = await tx.user.upsert({
      where: { id: SEED_IDS.users.departmentAdmin },
      update: {
        organizationId: organization.id,
        organizationRole: null,
        email: 'derparment@ai-workspace.local',
        username: 'derparment',
        passwordHash,
        status: 'ACTIVE',
      },
      create: {
        id: SEED_IDS.users.departmentAdmin,
        organizationId: organization.id,
        email: 'derparment@ai-workspace.local',
        username: 'derparment',
        passwordHash,
        status: 'ACTIVE',
      },
    });

    const departmentMemberUser = await tx.user.upsert({
      where: { id: SEED_IDS.users.departmentMember },
      update: {
        organizationId: organization.id,
        organizationRole: null,
        email: 'member@ai-workspace.local',
        username: 'member',
        passwordHash,
        status: 'ACTIVE',
      },
      create: {
        id: SEED_IDS.users.departmentMember,
        organizationId: organization.id,
        email: 'member@ai-workspace.local',
        username: 'member',
        passwordHash,
        status: 'ACTIVE',
      },
    });

    await tx.platformRoleAssignment.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: platformAdminRole.id,
        },
      },
      update: {},
      create: { userId: adminUser.id, roleId: platformAdminRole.id },
    });

    /** 8. 固定账号与唯一角色关系 */
    const setMembershipRoles = async (
      userId: string,
      departmentId: string,
      roleIds: string[],
    ) => {
      const membership = await tx.membership.upsert({
        where: { userId_departmentId: { userId, departmentId } },
        update: { status: 'ACTIVE' },
        create: { userId, departmentId, status: 'ACTIVE' },
      });
      await tx.membershipRole.deleteMany({
        where: { membershipId: membership.id },
      });
      await tx.membershipRole.createMany({
        data: roleIds.map((roleId) => ({
          membershipId: membership.id,
          roleId,
        })),
      });
    };

    await setMembershipRoles(departmentAdminUser.id, technologyDepartment.id, [
      adminRole.id,
    ]);
    await setMembershipRoles(
      departmentMemberUser.id,
      aiInnovationDepartment.id,
      [memberRole.id],
    );
    await tx.membership.deleteMany({
      where: {
        userId: departmentAdminUser.id,
        departmentId: { not: technologyDepartment.id },
      },
    });
    await tx.membership.deleteMany({
      where: {
        userId: departmentMemberUser.id,
        departmentId: { not: aiInnovationDepartment.id },
      },
    });
    await tx.membership.deleteMany({
      where: {
        userId: adminUser.id,
      },
    });
    await tx.membership.deleteMany({
      where: {
        userId: organizationAdminUser.id,
      },
    });
    await tx.platformRoleAssignment.deleteMany({
      where: {
        userId: {
          in: [
            organizationAdminUser.id,
            departmentAdminUser.id,
            departmentMemberUser.id,
          ],
        },
      },
    });

    await tx.knowledgeBase.updateMany({
      where: { createdById: adminUser.id },
      data: { createdById: departmentAdminUser.id },
    });
    await tx.document.updateMany({
      where: { createdById: adminUser.id },
      data: { createdById: departmentAdminUser.id },
    });
    await tx.conversation.deleteMany({ where: { userId: adminUser.id } });

    const legacyPlatformAdmin = await tx.user.findUnique({
      where: { id: 'user_platform_admin_001' },
      select: { id: true },
    });
    if (legacyPlatformAdmin) {
      await tx.knowledgeBase.updateMany({
        where: { createdById: legacyPlatformAdmin.id },
        data: { createdById: departmentAdminUser.id },
      });
      await tx.document.updateMany({
        where: { createdById: legacyPlatformAdmin.id },
        data: { createdById: departmentAdminUser.id },
      });
      await tx.conversation.deleteMany({
        where: { userId: legacyPlatformAdmin.id },
      });
      await tx.user.delete({ where: { id: legacyPlatformAdmin.id } });
    }

    console.log('Seed transaction completed.');
    console.log({
      organization: organization.name,
      adminAccount: {
        account: adminUser.username,
        role: 'PLATFORM_ADMIN',
      },
      permissionCount: permissions.length,
      fixedAccounts: [
        { role: 'PLATFORM_ADMIN', account: adminUser.username },
        { role: 'ORGANIZATION_ADMIN', account: organizationAdminUser.username },
        { role: 'DEPARTMENT_ADMIN', account: departmentAdminUser.username },
        { role: 'DEPARTMENT_MEMBER', account: departmentMemberUser.username },
      ],
    });
  });
}

main()
  .then(() => {
    console.log('Database seed completed successfully.');
  })
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Development 开发阶段
// npx prisma migrate reset
// npx prisma db seed
