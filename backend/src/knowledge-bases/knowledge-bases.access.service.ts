import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

import { KnowledgeBaseStatus } from 'src/generated/prisma/enums';

/**
 * 为了补字段，要查父资源；为了验证归属，查关联；如果目标表已经有外键字段，不需要为了验证关系再绕一圈查询父表。
 */
@Injectable()
export class KnowledgeBaseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccessibleKnowledgeBase(
    departmentId: string,
    knowledgeBaseId: string,
    options?: {
      includeArchived?: boolean;
    },
  ) {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id: knowledgeBaseId,
        departmentId,
        ...(options?.includeArchived
          ? {}
          : {
              status: KnowledgeBaseStatus.ACTIVE,
            }),
      },
    });
    if (!knowledgeBase) {
      throw new NotFoundException('Knowledge base not found');
    }

    return knowledgeBase;
  }
}
