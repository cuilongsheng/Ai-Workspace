import { Queue } from 'bullmq';
import { Client as MinioClient } from 'minio';
import { PrismaService } from '../src/prisma/prisma.service';
import { resolveStorageConfig } from '../src/storage/storage.config';

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is not configured`);
  return value;
}

async function main() {
  const storageConfig = resolveStorageConfig();
  const redisUrl = new URL(requireEnv('REDIS_URL'));
  const redisDatabase = redisUrl.pathname.slice(1);
  const prisma = new PrismaService();
  const queue = new Queue('document-processing', {
    connection: {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      username: redisUrl.username
        ? decodeURIComponent(redisUrl.username)
        : undefined,
      password: redisUrl.password
        ? decodeURIComponent(redisUrl.password)
        : undefined,
      db: redisDatabase ? Number(redisDatabase) : undefined,
      tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
    },
  });
  const storage = new MinioClient({
    endPoint: storageConfig.endPoint,
    port: storageConfig.port,
    useSSL: storageConfig.useSSL,
    accessKey: storageConfig.accessKey,
    secretKey: storageConfig.secretKey,
  });

  await prisma.$connect();
  try {
    const admin = await prisma.user.findFirst({
      where: { username: { equals: 'admin', mode: 'insensitive' } },
      include: {
        platformRoleAssignments: { include: { role: true } },
      },
    });
    if (
      !admin ||
      admin.organizationId !== null ||
      !admin.platformRoleAssignments.some(
        (assignment) => assignment.role.code === 'PLATFORM_ADMIN',
      )
    ) {
      throw new Error(
        'Refusing to clear data: the standalone PLATFORM_ADMIN account was not found.',
      );
    }

    const documents = await prisma.document.findMany({
      select: { storageKey: true },
    });

    await queue.pause();
    await queue.obliterate({ force: true });

    const deleted = await prisma.$transaction(async (tx) => {
      const conversations = await tx.conversation.deleteMany();
      const documentsResult = await tx.document.deleteMany();
      const knowledgeBases = await tx.knowledgeBase.deleteMany();
      const memberships = await tx.membership.deleteMany();
      const rolePermissions = await tx.rolePermission.deleteMany();
      const roles = await tx.role.deleteMany();
      const users = await tx.user.deleteMany({
        where: { id: { not: admin.id } },
      });
      const departments = await tx.department.deleteMany();
      const organizations = await tx.organization.deleteMany();
      return {
        conversations: conversations.count,
        documents: documentsResult.count,
        knowledgeBases: knowledgeBases.count,
        memberships: memberships.count,
        rolePermissions: rolePermissions.count,
        roles: roles.count,
        users: users.count,
        departments: departments.count,
        organizations: organizations.count,
      };
    });

    if (documents.length) {
      await storage.removeObjects(
        storageConfig.bucket,
        documents.map((document) => document.storageKey),
      );
    }

    const remainingUsers = await prisma.user.findMany({
      select: { username: true, email: true, organizationId: true },
    });
    const remainingBusinessData = {
      organizations: await prisma.organization.count(),
      departments: await prisma.department.count(),
      knowledgeBases: await prisma.knowledgeBase.count(),
      documents: await prisma.document.count(),
      conversations: await prisma.conversation.count(),
    };

    console.log(
      JSON.stringify(
        {
          preservedAdmin: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
          },
          deleted,
          deletedStorageObjects: documents.length,
          remainingUsers,
          remainingBusinessData,
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.allSettled([prisma.$disconnect(), queue.close()]);
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
