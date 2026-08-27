import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as argon2 from 'argon2';

const describeWhenReady = process.env.E2E === 'true' ? describe : describe.skip;

describeWhenReady('auth and platform flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects the legacy admin and keeps the platform account platform-only', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ account: 'admin', password: '123456' })
      .expect(401);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'platform.admin@ai-workspace.local',
        password: '123456',
      })
      .expect(200);

    expect(loginResponse.body.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.refreshToken).toBeUndefined();

    const rawCookies = loginResponse.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies)
      ? rawCookies
      : rawCookies
        ? [rawCookies]
        : [];

    expect(cookies?.join(';')).toContain('refresh_token=');
    expect(cookies?.join(';')).toContain('HttpOnly');

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(meResponse.body.email).toBe('platform.admin@ai-workspace.local');
    expect(meResponse.body.role).toBe('PLATFORM_ADMIN');
    expect(meResponse.body.platform.role).toBe('PLATFORM_ADMIN');
    expect(meResponse.body.organization).toBeNull();
    expect(meResponse.body.departments).toEqual([]);

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(200);

    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).toBeUndefined();

    await request(app.getHttpServer())
      .get('/platform/dashboard')
      .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.organizations).toEqual(expect.any(Number));
      });

    await request(app.getHttpServer())
      .get('/organization-admin/roles')
      .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
      .expect(403);
  });

  it('allows a department member to read knowledge bases but rejects management', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'department.member@ai-workspace.local',
        password: '123456',
      })
      .expect(200);
    const authorization = `Bearer ${loginResponse.body.accessToken}`;

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', authorization)
      .expect(200);

    expect(meResponse.body.departments[0].permissions).toEqual(
      expect.arrayContaining(['knowledge_base.read', 'document.read']),
    );

    await request(app.getHttpServer())
      .get('/departments/department_ai_innovation_001/knowledge-bases')
      .set('Authorization', authorization)
      .expect(200);

    await request(app.getHttpServer())
      .post('/departments/department_ai_innovation_001/knowledge-bases')
      .set('Authorization', authorization)
      .send({ name: 'Member must not create', description: null })
      .expect(403);

    await request(app.getHttpServer())
      .get('/organization-admin/departments')
      .set('Authorization', authorization)
      .expect(403);

    await request(app.getHttpServer())
      .get('/platform/dashboard')
      .set('Authorization', authorization)
      .expect(403);
  });

  it('isolates the independent platform administrator from tenant resources', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'platform.admin@ai-workspace.local',
        password: '123456',
      })
      .expect(200);
    const authorization = `Bearer ${loginResponse.body.accessToken}`;

    await request(app.getHttpServer())
      .get('/platform/dashboard')
      .set('Authorization', authorization)
      .expect(200);

    await request(app.getHttpServer())
      .get('/organization-admin/departments')
      .set('Authorization', authorization)
      .expect(403);
  });

  it('isolates the independent organization administrator from platform APIs', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'organization.admin@ai-workspace.local',
        password: '123456',
      })
      .expect(200);
    const authorization = `Bearer ${loginResponse.body.accessToken}`;

    await request(app.getHttpServer())
      .get('/organization-admin/departments')
      .set('Authorization', authorization)
      .expect(200);

    await request(app.getHttpServer())
      .get('/platform/dashboard')
      .set('Authorization', authorization)
      .expect(403);
  });

  it('limits the independent department administrator to its tenant scope', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'department.admin@ai-workspace.local',
        password: '123456',
      })
      .expect(200);
    const authorization = `Bearer ${loginResponse.body.accessToken}`;

    const knowledgeBases = await request(app.getHttpServer())
      .get('/departments/department_technology_001/knowledge-bases')
      .set('Authorization', authorization)
      .expect(200);

    const context = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', authorization)
      .expect(200);
    await request(app.getHttpServer())
      .post('/conversations')
      .set('Authorization', authorization)
      .send({
        organizationId: context.body.organization.id,
        departmentId: 'department_technology_001',
        knowledgeBaseId: knowledgeBases.body.items[0].id,
      })
      .expect(403);

    await request(app.getHttpServer())
      .get('/conversations?departmentId=department_technology_001')
      .set('Authorization', authorization)
      .expect(403);

    await request(app.getHttpServer())
      .get('/platform/dashboard')
      .set('Authorization', authorization)
      .expect(403);
  });

  it('protects member conversations from non-member department admins', async () => {
    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'department.member@ai-workspace.local',
        password: '123456',
      })
      .expect(200);
    const ownerAuthorization = `Bearer ${ownerLogin.body.accessToken}`;
    const ownerContext = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', ownerAuthorization)
      .expect(200);
    const department = ownerContext.body.departments[0];
    const knowledgeBases = await request(app.getHttpServer())
      .get(`/departments/${department.id}/knowledge-bases`)
      .set('Authorization', ownerAuthorization)
      .expect(200);
    const knowledgeBase = knowledgeBases.body.items[0];

    const conversation = await request(app.getHttpServer())
      .post('/conversations')
      .set('Authorization', ownerAuthorization)
      .send({
        organizationId: ownerContext.body.organization.id,
        departmentId: department.id,
        knowledgeBaseId: knowledgeBase.id,
        title: 'V1 ownership E2E',
      })
      .expect(201);

    const memberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'department.admin@ai-workspace.local',
        password: '123456',
      })
      .expect(200);
    const memberAuthorization = `Bearer ${memberLogin.body.accessToken}`;

    await request(app.getHttpServer())
      .get(`/conversations/${conversation.body.id}/messages`)
      .set('Authorization', memberAuthorization)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/conversations/${conversation.body.id}`)
      .set('Authorization', memberAuthorization)
      .expect(404);

    const foreignStream = await request(app.getHttpServer())
      .post(`/conversations/${conversation.body.id}/messages/stream`)
      .set('Authorization', memberAuthorization)
      .set('Accept-Language', 'en-US')
      .send({ content: 'This request must not reach retrieval or the LLM.' })
      .expect(201);

    expect(foreignStream.text).toContain('event: error');
    expect(foreignStream.text).not.toContain('event: delta');

    await request(app.getHttpServer())
      .delete(`/conversations/${conversation.body.id}`)
      .set('Authorization', ownerAuthorization)
      .expect(204);
  });

  it('closes tenant employee to fixed-role department membership without leaving fixtures', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const platformLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'platform.admin@ai-workspace.local',
        password: '123456',
      })
      .expect(200);
    const platformAuthorization = `Bearer ${platformLogin.body.accessToken}`;
    let organizationId: string | undefined;

    try {
      const created = await request(app.getHttpServer())
        .post('/platform/organizations')
        .set('Authorization', platformAuthorization)
        .send({ name: `V1 acceptance tenant ${suffix}` })
        .expect(201);
      organizationId = created.body.id;
      await request(app.getHttpServer())
        .patch(`/platform/organizations/${organizationId}/disable`)
        .set('Authorization', platformAuthorization)
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/platform/organizations/${organizationId}/enable`)
        .set('Authorization', platformAuthorization)
        .expect(200);
    } finally {
      if (organizationId)
        await prisma.organization.deleteMany({ where: { id: organizationId } });
    }

    const organizationLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'organization.admin@ai-workspace.local',
        password: '123456',
      })
      .expect(200);
    const organizationAuthorization = `Bearer ${organizationLogin.body.accessToken}`;
    let departmentId: string | undefined;
    const createdUserIds: string[] = [];

    try {
      const roles = await request(app.getHttpServer())
        .get('/organization-admin/roles')
        .set('Authorization', organizationAuthorization)
        .expect(200);
      const memberRole = roles.body.find(
        (role: { name: string }) => role.name === 'DEPARTMENT_MEMBER',
      );
      const adminRole = roles.body.find(
        (role: { name: string }) => role.name === 'DEPARTMENT_ADMIN',
      );

      const department = await request(app.getHttpServer())
        .post('/organization-admin/departments')
        .set('Authorization', organizationAuthorization)
        .send({ name: `V1 acceptance department ${suffix}` })
        .expect(201);
      departmentId = department.body.id;

      const departmentAdmin = await request(app.getHttpServer())
        .post('/organization-admin/employees')
        .set('Authorization', organizationAuthorization)
        .send({
          email: `v1.department.admin.${suffix}@ai-workspace.local`,
          username: 'V1 department admin',
          password: '123456',
          departmentId,
          roleIds: [adminRole.id, memberRole.id],
        })
        .expect(201);
      createdUserIds.push(departmentAdmin.body.id);

      const member = await request(app.getHttpServer())
        .post('/organization-admin/employees')
        .set('Authorization', organizationAuthorization)
        .send({
          email: `v1.member.${suffix}@ai-workspace.local`,
          username: 'V1 member',
          password: '123456',
        })
        .expect(201);
      createdUserIds.push(member.body.id);

      expect(
        departmentAdmin.body.memberships[0].roles
          .map(({ role }: { role: { name: string } }) => role.name)
          .sort(),
      ).toEqual(['DEPARTMENT_ADMIN', 'DEPARTMENT_MEMBER']);

      const departmentAdminLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ account: departmentAdmin.body.email, password: '123456' })
        .expect(200);
      const departmentAuthorization = `Bearer ${departmentAdminLogin.body.accessToken}`;

      const membership = await request(app.getHttpServer())
        .post(`/organization-admin/departments/${departmentId}/members`)
        .set('Authorization', departmentAuthorization)
        .send({ employeeId: member.body.id, roleIds: [memberRole.id] })
        .expect(201);

      await request(app.getHttpServer())
        .patch(
          `/organization-admin/departments/${departmentId}/members/${membership.body.id}`,
        )
        .set('Authorization', departmentAuthorization)
        .send({
          employeeId: member.body.id,
          roleIds: [adminRole.id, memberRole.id],
        })
        .expect(200)
        .expect(({ body }) =>
          expect(
            body.roles
              .map(({ role }: { role: { name: string } }) => role.name)
              .sort(),
          ).toEqual(['DEPARTMENT_ADMIN', 'DEPARTMENT_MEMBER']),
        );
    } finally {
      if (createdUserIds.length) {
        await prisma.membership.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
      if (departmentId)
        await prisma.department.deleteMany({ where: { id: departmentId } });
    }
  });
  it('rejects login, refresh, and existing bearer access after a tenant is disabled', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const password = '123456';
    const organization = await prisma.organization.create({
      data: { name: `V1 disabled tenant ${suffix}` },
    });
    const tenantUser = await prisma.user.create({
      data: {
        organizationId: organization.id,
        email: `v1.disabled.${suffix}@ai-workspace.local`,
        username: 'V1 disabled tenant user',
        passwordHash: await argon2.hash(password),
        status: 'ACTIVE',
      },
    });

    try {
      const tenantLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ account: tenantUser.email, password })
        .expect(200);
      const cookies = tenantLogin.headers['set-cookie'];

      const platformLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: 'platform.admin@ai-workspace.local',
          password: '123456',
        })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/platform/organizations/${organization.id}/disable`)
        .set('Authorization', `Bearer ${platformLogin.body.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${tenantLogin.body.accessToken}`)
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ account: tenantUser.email, password })
        .expect(401);
    } finally {
      await prisma.user.deleteMany({ where: { id: tenantUser.id } });
      await prisma.organization.deleteMany({ where: { id: organization.id } });
    }
  });

  it('enforces cross-organization, cross-department, and member management boundaries', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const mainAdmin = await prisma.user.findUniqueOrThrow({
      where: { email: 'department.admin@ai-workspace.local' },
    });
    const aiFixture = await prisma.knowledgeBase.create({
      data: {
        name: `V1 boundary KB ${suffix}`,
        organizationId: mainAdmin.organizationId!,
        departmentId: 'department_ai_innovation_001',
        createdById: mainAdmin.id,
      },
    });
    const aiDocument = await prisma.document.create({
      data: {
        name: `v1-boundary-${suffix}.md`,
        organizationId: mainAdmin.organizationId!,
        departmentId: 'department_ai_innovation_001',
        knowledgeBaseId: aiFixture.id,
        createdById: mainAdmin.id,
        status: 'PUBLISHED',
        originalName: `v1-boundary-${suffix}.md`,
        storageKey: `e2e/v1-boundary-${suffix}.md`,
        mimeType: 'text/markdown',
        size: 32,
      },
    });
    const aiChunk = await prisma.documentChunk.create({
      data: {
        documentId: aiDocument.id,
        organizationId: mainAdmin.organizationId!,
        departmentId: 'department_ai_innovation_001',
        knowledgeBaseId: aiFixture.id,
        chunkIndex: 0,
        content: 'V1 boundary fixture content',
        charCount: 27,
        embeddingModel: 'e2e-fixture',
      },
    });

    const foreignOrganization = await prisma.organization.create({
      data: { name: `V1 foreign organization ${suffix}` },
    });
    const foreignDepartment = await prisma.department.create({
      data: {
        name: `V1 foreign department ${suffix}`,
        organizationId: foreignOrganization.id,
      },
    });
    const foreignRole = await prisma.role.create({
      data: {
        name: 'DEPARTMENT_ADMIN',
        organizationId: foreignOrganization.id,
      },
    });
    const foreignUser = await prisma.user.create({
      data: {
        organizationId: foreignOrganization.id,
        email: `v1.foreign.${suffix}@ai-workspace.local`,
        passwordHash: await argon2.hash('123456'),
      },
    });
    await prisma.membership.create({
      data: {
        userId: foreignUser.id,
        departmentId: foreignDepartment.id,
        roles: { create: { roleId: foreignRole.id } },
      },
    });
    const foreignKb = await prisma.knowledgeBase.create({
      data: {
        name: `V1 foreign KB ${suffix}`,
        organizationId: foreignOrganization.id,
        departmentId: foreignDepartment.id,
        createdById: foreignUser.id,
      },
    });
    const foreignDocument = await prisma.document.create({
      data: {
        name: `v1-foreign-${suffix}.md`,
        organizationId: foreignOrganization.id,
        departmentId: foreignDepartment.id,
        knowledgeBaseId: foreignKb.id,
        createdById: foreignUser.id,
        status: 'PUBLISHED',
        originalName: `v1-foreign-${suffix}.md`,
        storageKey: `e2e/v1-foreign-${suffix}.md`,
        mimeType: 'text/markdown',
        size: 32,
      },
    });
    const foreignChunk = await prisma.documentChunk.create({
      data: {
        documentId: foreignDocument.id,
        organizationId: foreignOrganization.id,
        departmentId: foreignDepartment.id,
        knowledgeBaseId: foreignKb.id,
        chunkIndex: 0,
        content: 'Foreign organization fixture content',
        charCount: 36,
        embeddingModel: 'e2e-fixture',
      },
    });

    try {
      const organizationLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: 'organization.admin@ai-workspace.local',
          password: '123456',
        })
        .expect(200);
      const organizationAuthorization = `Bearer ${organizationLogin.body.accessToken}`;

      const departments = await request(app.getHttpServer())
        .get('/organization-admin/departments')
        .set('Authorization', organizationAuthorization)
        .expect(200);
      expect(
        departments.body.map((item: { id: string }) => item.id),
      ).not.toContain(foreignDepartment.id);

      const employees = await request(app.getHttpServer())
        .get('/organization-admin/employees')
        .set('Authorization', organizationAuthorization)
        .expect(200);
      expect(
        employees.body.map((item: { id: string }) => item.id),
      ).not.toContain(foreignUser.id);

      await request(app.getHttpServer())
        .get(`/platform/organizations/${foreignOrganization.id}`)
        .set('Authorization', organizationAuthorization)
        .expect(403);

      const departmentAdminLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: 'department.admin@ai-workspace.local',
          password: '123456',
        })
        .expect(200);
      const departmentAdminAuthorization = `Bearer ${departmentAdminLogin.body.accessToken}`;

      await request(app.getHttpServer())
        .get('/departments/department_ai_innovation_001/knowledge-bases')
        .set('Authorization', departmentAdminAuthorization)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/documents/${aiDocument.id}`)
        .set('Authorization', departmentAdminAuthorization)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/documents/${foreignDocument.id}`)
        .set('Authorization', departmentAdminAuthorization)
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/document-chunks/${foreignChunk.id}`)
        .set('Authorization', departmentAdminAuthorization)
        .send({ content: 'must not update' })
        .expect(403);

      const memberLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: 'department.member@ai-workspace.local',
          password: '123456',
        })
        .expect(200);
      const memberAuthorization = `Bearer ${memberLogin.body.accessToken}`;

      await request(app.getHttpServer())
        .get('/departments/department_technology_001/knowledge-bases')
        .set('Authorization', memberAuthorization)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/documents/${aiDocument.id}`)
        .set('Authorization', memberAuthorization)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/documents/${aiDocument.id}/chunks`)
        .set('Authorization', memberAuthorization)
        .expect(200);

      await request(app.getHttpServer())
        .post('/departments/department_ai_innovation_001/knowledge-bases')
        .set('Authorization', memberAuthorization)
        .send({ name: 'Member must not create', description: null })
        .expect(403);
      await request(app.getHttpServer())
        .patch(
          `/departments/department_ai_innovation_001/knowledge-bases/${aiFixture.id}`,
        )
        .set('Authorization', memberAuthorization)
        .send({ name: 'Member must not update' })
        .expect(403);
      await request(app.getHttpServer())
        .patch(
          `/departments/department_ai_innovation_001/knowledge-bases/${aiFixture.id}/archive`,
        )
        .set('Authorization', memberAuthorization)
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/documents/${aiDocument.id}`)
        .set('Authorization', memberAuthorization)
        .send({ name: 'Member must not update' })
        .expect(403);
      await request(app.getHttpServer())
        .delete(`/documents/${aiDocument.id}`)
        .set('Authorization', memberAuthorization)
        .expect(403);
      await request(app.getHttpServer())
        .post(`/documents/${aiDocument.id}/reprocess`)
        .set('Authorization', memberAuthorization)
        .expect(403);
      await request(app.getHttpServer())
        .post(`/documents/${aiDocument.id}/chunks`)
        .set('Authorization', memberAuthorization)
        .send({ content: 'Member must not create a chunk' })
        .expect(403);
      await request(app.getHttpServer())
        .post(`/documents/${aiDocument.id}/review`)
        .set('Authorization', memberAuthorization)
        .expect(403);
      await request(app.getHttpServer())
        .post(`/documents/${aiDocument.id}/publish`)
        .set('Authorization', memberAuthorization)
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/document-chunks/${aiChunk.id}`)
        .set('Authorization', memberAuthorization)
        .send({ content: 'Member must not update a chunk' })
        .expect(403);
      await request(app.getHttpServer())
        .delete(`/document-chunks/${aiChunk.id}`)
        .set('Authorization', memberAuthorization)
        .expect(403);
    } finally {
      await prisma.documentChunk.deleteMany({
        where: { id: { in: [aiChunk.id, foreignChunk.id] } },
      });
      await prisma.document.deleteMany({
        where: { id: { in: [aiDocument.id, foreignDocument.id] } },
      });
      await prisma.knowledgeBase.deleteMany({
        where: { id: { in: [aiFixture.id, foreignKb.id] } },
      });
      await prisma.membership.deleteMany({ where: { userId: foreignUser.id } });
      await prisma.user.deleteMany({ where: { id: foreignUser.id } });
      await prisma.role.deleteMany({ where: { id: foreignRole.id } });
      await prisma.department.deleteMany({
        where: { id: foreignDepartment.id },
      });
      await prisma.organization.deleteMany({
        where: { id: foreignOrganization.id },
      });
    }
  });

  it('stores starter questions per knowledge base and protects writes', async () => {
    const adminUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'department.admin@ai-workspace.local' },
      select: { id: true, organizationId: true },
    });
    const fixture = await prisma.knowledgeBase.create({
      data: {
        name: `starter-e2e-${Date.now()}`,
        organizationId: adminUser.organizationId!,
        departmentId: 'department_technology_001',
        createdById: adminUser.id,
      },
    });
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'department.admin@ai-workspace.local',
        password: '123456',
      })
      .expect(200);
    const adminAuthorization = `Bearer ${adminLogin.body.accessToken}`;
    const memberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'department.member@ai-workspace.local',
        password: '123456',
      })
      .expect(200);
    const memberAuthorization = `Bearer ${memberLogin.body.accessToken}`;
    const configuredQuestions = [
      '知识库管理员配置的验收问题',
      '第二条知识库验收问题',
    ];

    try {
      await request(app.getHttpServer())
        .patch(
          `/departments/department_technology_001/knowledge-bases/${fixture.id}/starter-questions`,
        )
        .set('Authorization', adminAuthorization)
        .send({ questions: configuredQuestions })
        .expect(200)
        .expect(({ body }) =>
          expect(body.questions).toEqual(configuredQuestions),
        );

      await request(app.getHttpServer())
        .get(
          `/departments/department_technology_001/knowledge-bases/${fixture.id}/starter-questions`,
        )
        .set('Authorization', adminAuthorization)
        .set('Accept-Language', 'en-US')
        .expect(200)
        .expect(({ body }) =>
          expect(body.questions).toEqual(configuredQuestions),
        );

      await request(app.getHttpServer())
        .get(
          `/departments/department_technology_001/knowledge-bases/${fixture.id}/starter-questions`,
        )
        .set('Authorization', memberAuthorization)
        .expect(403);

      await request(app.getHttpServer())
        .patch(
          `/departments/department_technology_001/knowledge-bases/${fixture.id}/starter-questions`,
        )
        .set('Authorization', memberAuthorization)
        .send({ questions: ['普通成员不得配置'] })
        .expect(403);
    } finally {
      await prisma.knowledgeBase.delete({ where: { id: fixture.id } });
    }
  });
});
