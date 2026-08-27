import { Module } from '@nestjs/common';

import { EmbeddingsModule } from 'src/embeddings/embeddings.module';

import { RetrievalService } from './retrieval.service';
import {
  RetrievalController,
  RetrievalDebugController,
} from './retrieval.controller';
import { AccessControlModule } from 'src/access-control/access-control.module';
import { QueryRewriteService } from './query-rewrite.service';
import { LlmModule } from 'src/ai/llm.module';
import { RerankerModule } from './reranker/reranker.module';

@Module({
  imports: [EmbeddingsModule, AccessControlModule, LlmModule, RerankerModule],
  controllers: [RetrievalController, RetrievalDebugController],
  providers: [RetrievalService, QueryRewriteService],
  exports: [RetrievalService],
})
export class RetrievalModule {}
