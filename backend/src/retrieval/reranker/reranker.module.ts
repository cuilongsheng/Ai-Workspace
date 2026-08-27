import { Module } from '@nestjs/common';

import { RerankerService } from './reranker.service';

@Module({
  providers: [RerankerService],

  exports: [RerankerService],
})
export class RerankerModule {}
