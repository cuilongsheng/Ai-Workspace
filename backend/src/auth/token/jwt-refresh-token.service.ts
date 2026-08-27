import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { RefreshTokenService } from './refresh-token.service';
import type {
  IssuedRefreshToken,
  RefreshTokenPayload,
} from '../token/token.types';

export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class JwtRefreshTokenService extends RefreshTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async issue(
    payload: Omit<RefreshTokenPayload, 'type'>,
  ): Promise<IssuedRefreshToken> {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    const refreshToken = await this.jwtService.signAsync(
      {
        ...payload,
        type: 'refresh',
      } satisfies RefreshTokenPayload,
      {
        secret,
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
        algorithm: 'HS256',
      },
    );

    return {
      refreshToken,
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    };
  }

  async verify(token: string): Promise<RefreshTokenPayload> {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        {
          secret,
          algorithms: ['HS256'],
        },
      );

      if (payload.type !== 'refresh' || !payload.sub || !payload.sid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
