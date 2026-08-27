import { Injectable, UnauthorizedException } from '@nestjs/common';

import { UserStatus } from '../../generated/prisma/enums';
import { UsersService } from '../../users/users.service';
import { PasswordHasher } from '../password/password-hasher';

// 负责账号和密码是否正确
@Injectable()
export class EmailPasswordAuthenticator {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async authenticate(account: string, password: string) {
    const user = await this.usersService.findByLogin(account);

    /*
     * 不区分“用户不存在”和“密码错误”，
     * 避免攻击者通过错误信息枚举系统账号。
     */
    if (!user) {
      throw new UnauthorizedException('Invalid account or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not available');
    }

    if (!(await this.usersService.isOrganizationActive(user.id))) {
      throw new UnauthorizedException('Organization is not available');
    }

    const passwordMatches = await this.passwordHasher.verify(
      user.passwordHash,
      password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid account or password');
    }

    return user;
  }
}
