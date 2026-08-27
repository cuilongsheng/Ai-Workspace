import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

import type { QueryRewriteHistoryMessage } from 'src/retrieval/query-rewrite.service';

@Injectable()
export class ConversationContextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取当前 Conversation
   * 最近 N 条有效历史。
   *
   * 当前 Message 必须在调用该方法后再保存，
   * 否则 Query Rewrite 会看到重复问题。
   */
  async getRecentHistory(
    conversationId: string,

    limit = 10,
  ): Promise<QueryRewriteHistoryMessage[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,

        /**
         * v1.0：
         *
         * 只让完整完成的消息进入 Query Rewrite。
         */
        status: 'COMPLETED',
      },

      orderBy: {
        createdAt: 'desc',
      },

      take: limit,

      select: {
        role: true,
        content: true,
      },
    });

    /**
     * SQL：
     * newest → oldest
     *
     * LLM：
     * oldest → newest
     */
    return messages.reverse().map((message) => ({
      role: message.role,

      content: message.content,
    }));
  }
}
