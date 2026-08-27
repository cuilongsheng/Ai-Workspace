import { Module } from '@nestjs/common';

import { LLM_PROVIDER } from './ai.constants';

import { DeepSeekLlmProvider } from './providers/deepseek-llm.provider';

@Module({
  providers: [
    DeepSeekLlmProvider,

    {
      provide: LLM_PROVIDER,

      useExisting: DeepSeekLlmProvider,
    },
  ],

  exports: [LLM_PROVIDER, DeepSeekLlmProvider],
})
export class LlmModule {}
