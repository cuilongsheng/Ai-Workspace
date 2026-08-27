import { Module } from '@nestjs/common';

import { AiModule } from 'src/ai/ai.module';

import { PrismaModule } from 'src/prisma/prisma.module';

import { ChatController } from './chat.controller';

import { ChatService } from './chat.service';

import { ConversationContextService } from './conversation-context.service';
import { KnowledgeBaseModule } from 'src/knowledge-bases/knowledge-bases.module';

@Module({
  imports: [PrismaModule, AiModule, KnowledgeBaseModule],

  controllers: [ChatController],

  providers: [ChatService, ConversationContextService],

  exports: [ChatService],
})
export class ChatModule {}
