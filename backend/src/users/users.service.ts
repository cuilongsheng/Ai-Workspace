import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
    });
  }

  async findByLogin(account: string) {
    const normalized = account.trim().toLowerCase();
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalized },
          { username: { equals: normalized, mode: 'insensitive' } },
        ],
      },
    });
  }

  async findById(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  async isOrganizationActive(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        organization: { select: { status: true } },
      },
    });
    return Boolean(
      user && (!user.organizationId || user.organization?.status === 'ACTIVE'),
    );
  }

  async getUserContext(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        email: true,
        username: true,
        status: true,
        organizationRole: true,

        organization: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },

        memberships: {
          where: {
            status: 'ACTIVE',
          },

          select: {
            id: true,
            status: true,

            department: {
              select: {
                id: true,
                name: true,
                nameEn: true,
              },
            },

            roles: {
              select: {
                role: {
                  select: {
                    id: true,
                    name: true,
                    permissions: {
                      select: {
                        permission: {
                          select: { code: true, name: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
