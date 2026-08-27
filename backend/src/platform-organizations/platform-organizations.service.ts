import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformOrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { organizationRole: 'ORGANIZATION_ADMIN' },
          take: 1,
          select: { id: true, email: true, username: true },
        },
      },
    });
  }
  async get(id: string) {
    const item = await this.prisma.organization.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Organization not found');
    return item;
  }
  async create(input: {
    name: string;
    administratorEmail: string;
    administratorName?: string;
    administratorPassword: string;
  }) {
    const email = input.administratorEmail.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } }))
      throw new ConflictException('User already exists');

    const passwordHash = await argon2.hash(input.administratorPassword);
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: input.name.trim() },
      });
      const administrator = await tx.user.create({
        data: {
          organizationId: organization.id,
          organizationRole: 'ORGANIZATION_ADMIN',
          email,
          username: input.administratorName?.trim() || null,
          passwordHash,
          status: 'ACTIVE',
        },
        select: { id: true, email: true, username: true },
      });
      return { ...organization, administrator };
    });
  }
  async update(id: string, name: string) {
    await this.get(id);
    return this.prisma.organization.update({ where: { id }, data: { name } });
  }
  async createAdministrator(
    organizationId: string,
    input: { email: string; username?: string; password: string },
  ) {
    await this.get(organizationId);
    const email = input.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } }))
      throw new ConflictException('User already exists');
    return this.prisma.user.create({
      data: {
        organizationId,
        organizationRole: 'ORGANIZATION_ADMIN',
        email,
        username: input.username?.trim() || null,
        passwordHash: await argon2.hash(input.password),
        status: 'ACTIVE',
      },
      select: { id: true, email: true, username: true },
    });
  }
  async disable(id: string) {
    await this.get(id);
    return this.prisma.organization.update({
      where: { id },
      data: { status: 'DISABLED' },
    });
  }
  async enable(id: string) {
    await this.get(id);
    return this.prisma.organization.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async dashboard() {
    const [
      organizations,
      activeOrganizations,
      disabledOrganizations,
      recentOrganizations,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { status: 'ACTIVE' } }),
      this.prisma.organization.count({ where: { status: 'DISABLED' } }),
      this.prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, status: true, createdAt: true },
      }),
    ]);

    return {
      organizations,
      activeOrganizations,
      disabledOrganizations,
      recentOrganizations,
    };
  }
}
