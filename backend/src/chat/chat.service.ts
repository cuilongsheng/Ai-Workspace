import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { AiService } from 'src/ai/ai.service';

import { PrismaService } from 'src/prisma/prisma.service';

import { ConversationContextService } from './conversation-context.service';
import { ChatStreamEvent } from './types/chat-stream-event';
import { KnowledgeBaseService } from 'src/knowledge-bases/knowledge-bases.service';
import { localizeMessage } from 'src/i18n/localize-message';
import type { ApiLocale } from 'src/i18n/localize-message';
import { Prisma } from 'src/generated/prisma/client';
import type { RetrievalStatus } from 'src/retrieval/types/retrieval.types';

interface CreateConversationInput {
  userId: string;

  organizationId: string;

  departmentId: string;

  knowledgeBaseId: string;

  title?: string;
}

const CHAT_ROLE_NAMES = ['DEPARTMENT_ADMIN', 'DEPARTMENT_MEMBER'];

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,

    private readonly aiService: AiService,

    private readonly conversationContextService: ConversationContextService,

    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {}

  /**
   * ============================================================
   * Create Conversation
   * ============================================================
   */
  async createConversation(input: CreateConversationInput) {
    /**
     * 用户当前必须仍然属于该 Department。
     */
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: input.userId,

        departmentId: input.departmentId,

        status: 'ACTIVE',

        roles: {
          some: { role: { name: { in: CHAT_ROLE_NAMES } } },
        },

        department: {
          organizationId: input.organizationId,
        },
      },

      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this department');
    }

    /**
     * KB 必须真的属于：
     *
     * organization + department
     */
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id: input.knowledgeBaseId,

        organizationId: input.organizationId,

        departmentId: input.departmentId,

        status: 'ACTIVE',
      },

      select: {
        id: true,
      },
    });

    if (!knowledgeBase) {
      throw new NotFoundException('Knowledge base not found');
    }

    const readiness = await this.knowledgeBaseService.getReadiness(
      input.departmentId,
      input.knowledgeBaseId,
    );
    if (readiness.status !== 'READY') {
      throw new BadRequestException('Knowledge base is not ready for chat');
    }

    return this.prisma.conversation.create({
      data: {
        userId: input.userId,

        organizationId: input.organizationId,

        departmentId: input.departmentId,

        knowledgeBaseId: input.knowledgeBaseId,

        title: input.title?.trim() || null,
      },
    });
  }

  /**
   * ============================================================
   * Conversation List
   * ============================================================
   */
  async getConversations(userId: string, departmentId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        departmentId,
        status: 'ACTIVE',
        roles: {
          some: { role: { name: { in: CHAT_ROLE_NAMES } } },
        },
      },
      select: { id: true },
    });
    if (!membership)
      throw new ForbiddenException('Department chat access is required');
    return this.prisma.conversation.findMany({
      where: {
        userId,

        departmentId,

        knowledgeBase: {
          status: 'ACTIVE',
        },

        department: {
          memberships: {
            some: {
              userId,

              status: 'ACTIVE',

              roles: {
                some: { role: { name: { in: CHAT_ROLE_NAMES } } },
              },
            },
          },
        },
      },

      orderBy: {
        updatedAt: 'desc',
      },

      select: {
        id: true,

        title: true,

        organizationId: true,

        departmentId: true,

        knowledgeBaseId: true,

        createdAt: true,

        updatedAt: true,

        /**
         * 左侧列表只需要最后一条。
         */
        messages: {
          orderBy: {
            createdAt: 'desc',
          },

          take: 1,

          select: {
            role: true,

            content: true,

            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * 仅允许会话创建者删除自己的历史记录。
   * Message 和 MessageCitation 由数据库级级联约束一并清理。
   */
  async deleteConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.getAccessibleConversation(conversationId, userId);
    const result = await this.prisma.conversation.deleteMany({
      where: { id: conversationId, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Conversation not found');
    }
  }

  /**
   * ============================================================
   * Messages
   * ============================================================
   */
  async getMessages(
    conversationId: string,

    userId: string,
  ) {
    const conversation = await this.getAccessibleConversation(
      conversationId,
      userId,
    );

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
      },

      orderBy: {
        createdAt: 'asc',
      },

      include: {
        citations: {
          orderBy: {
            sourceNumber: 'asc',
          },
        },
        ragTrace: { select: { status: true } },
        feedback: {
          where: { userId },
          select: { helpful: true },
          take: 1,
        },
      },
    });
    return messages.map(({ ragTrace, feedback, ...message }) => ({
      ...message,
      retrievalStatus: ragTrace?.status ?? null,
      helpful: feedback[0]?.helpful ?? null,
    }));
  }

  /**
   * ============================================================
   * Streaming Message
   * ============================================================
   *
   * Chat v1.0 核心入口。
   */
  async *streamMessage(
    conversationId: string,

    userId: string,

    content: string,

    locale: ApiLocale = 'zh-CN',
  ): AsyncGenerator<ChatStreamEvent> {
    const question = content.trim();

    if (!question) {
      throw new BadRequestException('Message cannot be empty');
    }

    /**
     * 1.
     * Conversation ownership
     * +
     * 当前权限验证。
     */
    const conversation = await this.getAccessibleConversation(
      conversationId,
      userId,
    );

    const readiness = await this.knowledgeBaseService.getReadiness(
      conversation.departmentId,
      conversation.knowledgeBaseId,
    );

    if (readiness.status !== 'READY') {
      const message = localizeMessage(
        'Knowledge base is not ready for chat',
        locale,
      );
      const [, assistantMessage] = await this.prisma.$transaction([
        this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'USER',
            status: 'COMPLETED',
            content: question,
          },
        }),
        this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'ASSISTANT',
            status: 'COMPLETED',
            content: message,
          },
        }),
        this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        }),
      ]);
      yield { type: 'start', messageId: assistantMessage.id };
      const suggestions = this.localizedSuggestions('not_ready', locale);
      await this.prisma.ragTrace.create({
        data: {
          messageId: assistantMessage.id,
          status: 'not_ready',
          diagnostics: {
            status: 'not_ready',
            readiness,
          },
        },
      });
      yield {
        type: 'retrieval',
        status: 'not_ready',
        message,
        suggestions,
      };
      yield { type: 'done', messageId: assistantMessage.id };
      return;
    }

    /**
     * 2.
     * 当前 User Message 保存之前读取历史。
     *
     * 非常重要：
     * 防止当前问题重复进入 Query Rewrite。
     */
    const history = await this.conversationContextService.getRecentHistory(
      conversation.id,
      10,
    );

    /**
     * 3.
     * USER Message 已经完整存在。
     */
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,

        role: 'USER',

        status: 'COMPLETED',

        content: question,
      },
    });

    /**
     * 4.
     * 创建 AI 占位 Message。
     */
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,

        role: 'ASSISTANT',

        status: 'STREAMING',

        content: '',
      },
    });

    /**
     * 5.
     * 第一个 SSE event。
     */
    yield {
      type: 'start',

      messageId: assistantMessage.id,
    };

    let fullContent = '';

    let model: string | undefined;

    let traceDiagnostics: Prisma.InputJsonValue | null = null;

    try {
      /**
       * ======================================================
       * Prepare RAG
       * ======================================================
       */
      const prepared = await this.aiService.prepareRag(
        question,

        {
          organizationId: conversation.organizationId,

          departmentId: conversation.departmentId,

          knowledgeBaseId: conversation.knowledgeBaseId,
        },

        history,
      );
      traceDiagnostics =
        prepared.diagnostics as unknown as Prisma.InputJsonValue;

      if (!['grounded', 'partial'].includes(prepared.status)) {
        fullContent = this.localizedRetrievalMessage(prepared.status, locale);
        yield {
          type: 'retrieval',
          status: prepared.status,
          message: fullContent,
          suggestions:
            prepared.status === 'needs_clarification'
              ? prepared.chunks
                  .map((chunk) => chunk.sectionTitle)
                  .filter((title): title is string => Boolean(title))
                  .slice(0, 3)
              : this.localizedSuggestions(prepared.status, locale),
        };
      } else {
        yield { type: 'retrieval', status: prepared.status };

        /**
         * ======================================================
         * DeepSeek Streaming
         * ======================================================
         */
        for await (const chunk of this.aiService.streamPreparedRag(prepared)) {
          fullContent += chunk.content;

          if (chunk.model) {
            model = chunk.model;
          }

          /**
           * DeepSeek 一块，
           * 前端立即收到一块。
           */
          yield {
            type: 'delta',

            content: chunk.content,
          };
        }
      }

      /**
       * ======================================================
       * Citation
       * ======================================================
       */
      const citations = this.aiService.buildCitations(
        prepared.chunks,

        fullContent,
      );

      /**
       * ======================================================
       * Final Persistence
       * ======================================================
       *
       * 不每 token update DB。
       *
       * 完成后一次写入。
       */
      await this.prisma.$transaction(async (tx) => {
        await tx.message.update({
          where: {
            id: assistantMessage.id,
          },

          data: {
            content: fullContent,

            model: model ?? null,

            status: 'COMPLETED',
          },
        });

        if (citations.length > 0) {
          await tx.messageCitation.createMany({
            data: citations.map((citation) => ({
              messageId: assistantMessage.id,

              documentId: citation.documentId,

              documentChunkId: citation.documentChunkId,

              sourceNumber: citation.sourceNumber,

              documentName: citation.documentName,

              chunkIndex: citation.chunkIndex,

              quote: citation.quote,

              similarity: citation.similarity,

              retrievalScore: citation.retrievalScore,

              rerankScore: citation.rerankScore,
            })),
          });
        }

        await tx.ragTrace.create({
          data: {
            messageId: assistantMessage.id,
            status: prepared.status,
            diagnostics:
              prepared.diagnostics as unknown as Prisma.InputJsonValue,
          },
        });

        /**
         * Message 新增不会自动触发
         * Conversation.updatedAt。
         */
        await tx.conversation.update({
          where: {
            id: conversation.id,
          },

          data: {
            updatedAt: new Date(),
          },
        });
      });

      /**
       * Citation 不需要 token-by-token。
       *
       * Answer 完成后统一发。
       */
      yield {
        type: 'citations',

        citations,
      };

      yield {
        type: 'done',

        messageId: assistantMessage.id,
      };

      this.logger.debug(
        [
          'Chat stream completed',

          `Conversation: ${conversation.id}`,

          `Message: ${assistantMessage.id}`,

          `Content length: ${fullContent.length}`,

          `Citations: ${citations.length}`,
        ].join('\n'),
      );
    } catch (error) {
      /**
       * 已经收到的 partial content 仍然保存，
       * 方便排查。
       */
      await this.prisma.message.update({
        where: {
          id: assistantMessage.id,
        },

        data: {
          content: fullContent,

          model: model ?? null,

          status: 'FAILED',
        },
      });

      const message = error instanceof Error ? error.message : String(error);

      await this.prisma.ragTrace.upsert({
        where: { messageId: assistantMessage.id },
        create: {
          messageId: assistantMessage.id,
          status: 'generation_failed',
          diagnostics: {
            retrieval: traceDiagnostics ?? null,
            generationError: message,
          },
        },
        update: {
          status: 'generation_failed',
          diagnostics: {
            retrieval: traceDiagnostics ?? null,
            generationError: message,
          },
        },
      });

      this.logger.error(
        [
          'Chat stream failed',

          `Conversation: ${conversation.id}`,

          `Message: ${assistantMessage.id}`,

          `Error: ${message}`,
        ].join('\n'),
      );

      yield {
        type: 'error',

        message: 'Failed to generate assistant response.',
      };
    }
  }

  async saveMessageFeedback(
    messageId: string,
    userId: string,
    helpful: boolean,
    reason?: string,
  ) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        role: 'ASSISTANT',
        conversation: { userId },
      },
      select: { id: true },
    });
    if (!message) throw new NotFoundException('Message not found');
    return this.prisma.messageFeedback.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: {
        messageId,
        userId,
        helpful,
        reason: reason?.trim() || null,
      },
      update: {
        helpful,
        reason: reason?.trim() || null,
      },
    });
  }

  private localizedRetrievalMessage(
    status: RetrievalStatus,
    locale: ApiLocale,
  ) {
    const messageByStatus: Record<RetrievalStatus, string> = {
      grounded: '',
      no_match: 'No matching published knowledge base content was found',
      retrieval_unavailable: 'Knowledge retrieval service is unavailable',
      needs_clarification: 'The question needs clarification',
      partial: 'Only part of the question is supported by the knowledge base',
    };
    return localizeMessage(messageByStatus[status], locale);
  }

  private localizedSuggestions(
    status: RetrievalStatus | 'not_ready',
    locale: ApiLocale,
  ) {
    const suggestions: Record<string, string[]> = {
      not_ready: [
        'Ask a department administrator to publish documents',
        'Choose another knowledge base',
      ],
      no_match: [
        'Check whether names contain typos',
        'Ask with a complete entity name',
        'Choose another knowledge base',
      ],
      retrieval_unavailable: ['Try again later', 'Contact an administrator'],
      needs_clarification: ['Add a complete name or time range'],
      partial: ['Ask a follow-up question about the unsupported part'],
      grounded: [],
    };
    return suggestions[status].map((message) =>
      localizeMessage(message, locale),
    );
  }

  /**
   * ============================================================
   * Conversation Access
   * ============================================================
   */
  private async getAccessibleConversation(
    conversationId: string,

    userId: string,
  ) {
    /**
     * 首先防止 IDOR：
     *
     * User A
     * 不允许拿 User B conversationId。
     */
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,

        userId,
      },

      select: {
        id: true,

        organizationId: true,

        departmentId: true,

        knowledgeBaseId: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    /**
     * Conversation 是以前创建的，
     * 但用户可能现在已经被移出 Department。
     */
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,

        departmentId: conversation.departmentId,

        status: 'ACTIVE',

        roles: {
          some: { role: { name: { in: CHAT_ROLE_NAMES } } },
        },
      },

      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You no longer have access to this department',
      );
    }

    /**
     * KB 也必须仍然存在于
     * Conversation 固定的 org/department。
     */
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id: conversation.knowledgeBaseId,

        organizationId: conversation.organizationId,

        departmentId: conversation.departmentId,

        status: 'ACTIVE',
      },

      select: {
        id: true,
      },
    });

    if (!knowledgeBase) {
      throw new ForbiddenException('Knowledge base is no longer accessible');
    }

    return conversation;
  }
}
