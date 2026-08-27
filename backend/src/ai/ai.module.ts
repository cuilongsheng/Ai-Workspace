import { Module } from '@nestjs/common';

import { RetrievalModule } from 'src/retrieval/retrieval.module';

import { AiService } from './ai.service';

import { ContextBuilderService } from './context-builder.service';

import { LlmModule } from './llm.module';

@Module({
  imports: [RetrievalModule, LlmModule],

  providers: [AiService, ContextBuilderService],

  exports: [AiService],
})
export class AiModule {}
