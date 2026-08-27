import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

import { RedisService } from '../../redis/redis.service';
import { REFRESH_TOKEN_TTL_SECONDS } from '../token/jwt-refresh-token.service';
import type { AuthSession } from './auth-session.types';

@Injectable()
export class AuthSessionService {
  constructor(private readonly redisService: RedisService) {}

  async create(
    sessionId: string,
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const now = new Date().toISOString();

    const session: AuthSession = {
      userId,
      tokenHash: this.hashToken(refreshToken),
      createdAt: now,
      lastRotatedAt: now,
    };

    await this.redisService.setJson(
      this.getKey(sessionId),
      session,
      REFRESH_TOKEN_TTL_SECONDS,
    );
  }

  async validate(
    sessionId: string,
    userId: string,
    refreshToken: string,
  ): Promise<AuthSession> {
    const session = await this.redisService.getJson<AuthSession>(
      this.getKey(sessionId),
    );

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Session is not available');
    }

    const incomingHash = this.hashToken(refreshToken);

    if (!this.safeEqual(session.tokenHash, incomingHash)) {
      await this.revoke(sessionId);

      throw new UnauthorizedException('Refresh token reuse detected');
    }

    return session;
  }

  async rotate(
    sessionId: string,
    userId: string,
    newRefreshToken: string,
    createdAt: string,
  ): Promise<void> {
    const session: AuthSession = {
      userId,
      tokenHash: this.hashToken(newRefreshToken),
      createdAt,
      lastRotatedAt: new Date().toISOString(),
    };

    await this.redisService.setJson(
      this.getKey(sessionId),
      session,
      REFRESH_TOKEN_TTL_SECONDS,
    );
  }
  async find(sid: string) {
    const key = `auth:session:${sid}`;

    const session = await this.redisService.getJson<AuthSession>(key);

    if (!session) {
      return null;
    }

    return session;
  }

  async revoke(sessionId: string): Promise<void> {
    await this.redisService.delete(this.getKey(sessionId));
  }

  private getKey(sessionId: string): string {
    return `auth:session:${sessionId}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private safeEqual(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(actual);

    return (
      expectedBuffer.length === actualBuffer.length &&
      timingSafeEqual(expectedBuffer, actualBuffer)
    );
  }
}
