import {
  Inject,
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: Redis,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.client.connect();

    const result = await this.client.ping();

    if (result !== 'PONG') {
      throw new Error('Redis health check failed');
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.quit();
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}
