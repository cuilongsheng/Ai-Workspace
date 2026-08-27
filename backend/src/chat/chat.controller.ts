import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';

import { ChatService } from './chat.service';

import { CreateConversationDto } from './dto/create-conversation.dto';

import { SendMessageDto } from './dto/send-message.dto';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthUser } from 'src/auth/types/auth-user';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { localizeMessage, resolveLocale } from '../i18n/localize-message';
import { MessageFeedbackDto } from './dto/message-feedback.dto';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
@ApiTags('Chat')
@ApiBearerAuth('bearerAuth')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * ============================================================
   * Create
   * ============================================================
   */
  @Post()
  @ApiOperation({ operationId: 'Chat_createConversation' })
  createConversation(
    @CurrentUser()
    user: AuthUser,

    @Body()
    dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation({
      userId: user.id,

      organizationId: dto.organizationId,

      departmentId: dto.departmentId,

      knowledgeBaseId: dto.knowledgeBaseId,

      title: dto.title,
    });
  }

  /**
   * ============================================================
   * List
   * ============================================================
   */
  @Get()
  @ApiOperation({ operationId: 'Chat_listConversations' })
  getConversations(
    @CurrentUser()
    user: AuthUser,
    @Query('departmentId') departmentId: string,
  ) {
    return this.chatService.getConversations(user.id, departmentId);
  }

  /**
   * 删除当前用户自己的对话及其消息、引用快照。
   */
  @Delete(':conversationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'Chat_deleteConversation' })
  async deleteConversation(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
  ): Promise<void> {
    await this.chatService.deleteConversation(conversationId, user.id);
  }

  /**
   * ============================================================
   * History
   * ============================================================
   */
  @Get(':conversationId/messages')
  @ApiOperation({ operationId: 'Chat_listMessages' })
  getMessages(
    @CurrentUser()
    user: AuthUser,

    @Param('conversationId')
    conversationId: string,
  ) {
    return this.chatService.getMessages(conversationId, user.id);
  }

  @Post('messages/:messageId/feedback')
  @ApiOperation({ operationId: 'Chat_saveMessageFeedback' })
  saveMessageFeedback(
    @CurrentUser() user: AuthUser,
    @Param('messageId') messageId: string,
    @Body() dto: MessageFeedbackDto,
  ) {
    return this.chatService.saveMessageFeedback(
      messageId,
      user.id,
      dto.helpful,
      dto.reason,
    );
  }

  /**
   * ============================================================
   * Streaming Message
   * ============================================================
   *
   * POST /conversations/:id/messages/stream
   */
  @Post(':conversationId/messages/stream')
  @ApiOperation({ operationId: 'Chat_streamMessage' })
  @ApiConsumes('application/json')
  @ApiProduces('text/event-stream')
  async streamMessage(
    @CurrentUser()
    user: AuthUser,

    @Param('conversationId')
    conversationId: string,

    @Body()
    dto: SendMessageDto,

    @Headers('accept-language')
    acceptLanguage: string | undefined,

    @Res()
    response: Response,
  ) {
    /**
     * SSE headers。
     */
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');

    response.setHeader('Cache-Control', 'no-cache, no-transform');

    response.setHeader('Connection', 'keep-alive');

    /**
     * Nginx 反向代理时避免 buffer。
     */
    response.setHeader('X-Accel-Buffering', 'no');

    response.flushHeaders();

    try {
      for await (const event of this.chatService.streamMessage(
        conversationId,

        user.id,

        dto.content,

        resolveLocale(acceptLanguage),
      )) {
        const localizedEvent =
          event.type === 'error'
            ? {
                ...event,
                message: localizeMessage(
                  event.message,
                  resolveLocale(acceptLanguage),
                ),
              }
            : event;
        response.write(`event: ${localizedEvent.type}\n`);

        response.write(`data: ${JSON.stringify(localizedEvent)}\n\n`);
      }
    } catch (error) {
      /**
       * 一旦 SSE header 已发送，
       * 不能再返回 Nest 普通 JSON Error。
       */
      const message = localizeMessage(
        error instanceof Error ? error.message : 'Unknown error',
        resolveLocale(acceptLanguage),
      );

      response.write('event: error\n');

      response.write(
        `data: ${JSON.stringify({
          type: 'error',
          message,
        })}\n\n`,
      );
    } finally {
      response.end();
    }
  }
}
