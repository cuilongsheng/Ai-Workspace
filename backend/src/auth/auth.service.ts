import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailPasswordAuthenticator } from './authenticators/email-password.authenticator';
import { LoginDto } from './dto/login.dto';
import { AuthSessionService } from './session/auth-session.service';
import { AccessTokenService } from './token/access-token.service';
import { RefreshTokenService } from './token/refresh-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,

    private readonly prisma: PrismaService,

    private readonly emailPasswordAuthenticator: EmailPasswordAuthenticator,

    private readonly accessTokenService: AccessTokenService,

    private readonly refreshTokenService: RefreshTokenService,

    private readonly authSessionService: AuthSessionService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.emailPasswordAuthenticator.authenticate(
      dto.account,
      dto.password,
    );

    // 当前设备/当前登录的一次独立会话
    const sessionId = randomUUID();

    const accessToken = await this.accessTokenService.issue({
      sub: user.id,
      sid: sessionId,
    });

    const refreshToken = await this.refreshTokenService.issue({
      sub: user.id,
      sid: sessionId,
    });

    await this.authSessionService.create(
      sessionId,
      user.id,
      refreshToken.refreshToken,
    );

    return {
      ...accessToken,

      /**
       * 目前临时返回给 Controller。
       * 下一步由 Controller 将其写入 HttpOnly Cookie，
       * 然后不再把 refreshToken 暴露在 JSON 中。
       */
      refreshToken: refreshToken.refreshToken,
      refreshTokenExpiresIn: refreshToken.expiresIn,

      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        status: user.status,
      },
    };
  }

  async refresh(currentRefreshToken: string) {
    /*
     * 1. 验证 JWT 签名、有效期、type、sub、sid。
     */
    const payload = await this.refreshTokenService.verify(currentRefreshToken);

    /*
     * 2. 验证 Redis Session 和 Token Hash。
     */
    const session = await this.authSessionService.validate(
      payload.sid,
      payload.sub,
      currentRefreshToken,
    );

    /*
     * 3. 用户可能已经被删除或禁用。
     */
    const user = await this.usersService.findById(payload.sub);

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !(await this.usersService.isOrganizationActive(user.id))
    ) {
      await this.authSessionService.revoke(payload.sid);

      throw new UnauthorizedException('User is not available');
    }

    /*
     * 4. 使用相同 sessionId 签发新的 Token。
     */
    const newAccessToken = await this.accessTokenService.issue({
      sub: user.id,
      sid: payload.sid,
    });

    const newRefreshToken = await this.refreshTokenService.issue({
      sub: user.id,
      sid: payload.sid,
    });

    /*
     * 5. 更新 Redis 中保存的 Refresh Token Hash。
     * 旧 Refresh Token 从此失效。
     */
    await this.authSessionService.rotate(
      payload.sid,
      user.id,
      newRefreshToken.refreshToken,
      session.createdAt,
    );

    return {
      ...newAccessToken,
      refreshToken: newRefreshToken.refreshToken,
      refreshTokenExpiresIn: newRefreshToken.expiresIn,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.usersService.getUserContext(userId);

    if (!user) {
      return null;
    }

    const platformAssignment =
      await this.prisma.platformRoleAssignment.findFirst({
        where: { userId, role: { code: 'PLATFORM_ADMIN' } },
        select: {
          role: {
            select: {
              code: true,
              permissions: {
                select: { permission: { select: { code: true } } },
              },
            },
          },
        },
      });

    const departmentRoleNames = user.memberships.flatMap((membership) =>
      membership.roles.map(({ role }) => role.name),
    );
    const accountRole = platformAssignment
      ? 'PLATFORM_ADMIN'
      : user.organizationRole === 'ORGANIZATION_ADMIN'
        ? 'ORGANIZATION_ADMIN'
        : departmentRoleNames.includes('DEPARTMENT_ADMIN')
          ? 'DEPARTMENT_ADMIN'
          : departmentRoleNames.includes('DEPARTMENT_MEMBER')
            ? 'DEPARTMENT_MEMBER'
            : null;

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      status: user.status,
      role: accountRole,
      platform: platformAssignment
        ? {
            role: platformAssignment.role.code,
            permissions: platformAssignment.role.permissions.map(
              ({ permission }) => permission.code,
            ),
          }
        : null,
      organization: user.organization
        ? {
            ...user.organization,
            role: user.organizationRole,
            permissions:
              user.organizationRole === 'ORGANIZATION_ADMIN'
                ? [
                    'department.read',
                    'department.create',
                    'department.update',
                    'employee.read',
                    'employee.create',
                    'employee.update',
                    'employee.delete',
                    'membership.bootstrap_admin',
                    'role.read',
                  ]
                : [],
          }
        : null,

      departments: user.memberships.map((membership) => {
        const roles = membership.roles.map(({ role }) => ({
          id: role.id,
          name: role.name,
        }));
        const permissions = [
          ...new Set(
            membership.roles.flatMap(({ role }) =>
              role.permissions.map(({ permission }) => permission.code),
            ),
          ),
        ];
        return {
          membershipId: membership.id,
          id: membership.department.id,
          name: membership.department.name,
          nameEn: membership.department.nameEn,
          roles,
          permissions,
        };
      }),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.refreshTokenService.verify(refreshToken);

      await this.authSessionService.revoke(payload.sid);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        /*
         * Logout 设计为幂等操作：
         * 即使 Cookie 已过期、Token 无效或 Session 已不存在，
         * 仍然允许客户端完成本地退出。调用十次 logout → 仍然是已退出
         */
        return;
      }
      // Redis挂了怎么办？数据库挂了怎么办？异常应该继续向上抛
      throw error;
    }
  }
}
