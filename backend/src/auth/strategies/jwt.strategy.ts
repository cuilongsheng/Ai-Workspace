import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserStatus } from '../../generated/prisma/enums';
import { UsersService } from '../../users/users.service';
import type { AccessTokenPayload } from '../token/token.types';
import type { AuthUser } from '../types/auth-user';
import { AuthSessionService } from '../session/auth-session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authSessionService: AuthSessionService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从请求头读取Authorization: Bearer eyJhbGciOi...
      secretOrKey: secret, // 使用相同的JWT_SECRET验证token签名
      ignoreExpiration: false, // Token 过期后直接拒绝
      algorithms: ['HS256'], // 明确限制签名算法，避免接受不期望的算法
    });
  }
  // 签名、格式、有效期验证通过后，Passport 才会调用这里
  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    if (payload.type !== 'access' || !payload.sub || !payload.sid) {
      throw new UnauthorizedException('Invalid access token');
    }
    const session = await this.authSessionService.find(payload.sid);

    if (!session) {
      throw new UnauthorizedException();
    }
    const user = await this.usersService.findById(payload.sub);
    // 用户仍然存在；用户仍然是 ACTIVE
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not available');
    }
    if (!(await this.usersService.isOrganizationActive(user.id))) {
      throw new UnauthorizedException('Organization is not available');
    }
    // 返回的内容会被 Passport 放到 req.user 中
    return {
      id: user.id,
      sessionId: payload.sid,
    };
  }
}
