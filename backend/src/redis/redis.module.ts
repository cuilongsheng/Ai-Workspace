import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          throw new Error('REDIS_URL is not configured');
        }

        return new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
        });
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
