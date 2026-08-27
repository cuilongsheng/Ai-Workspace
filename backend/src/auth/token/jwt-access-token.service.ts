import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AccessTokenService } from './access-token.service';
import type {
  AccessTokenPayload,
  IssuedAccessToken,
} from '../token/token.types';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

@Injectable()
export class JwtAccessTokenService extends AccessTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async issue(
    payload: Omit<AccessTokenPayload, 'type'>,
  ): Promise<IssuedAccessToken> {
    const secret = this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const accessToken = await this.jwtService.signAsync(
      {
        ...payload,
        type: 'access',
      } satisfies AccessTokenPayload,
      {
        secret,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        algorithm: 'HS256',
      },
    );

    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      tokenType: 'Bearer',
    };
  }
}
