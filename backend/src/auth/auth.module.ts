import { Module } from '@nestjs/common';

import { PasswordHasher } from './password/password-hasher';
import { ArgonPasswordHasher } from './password/argon-password-hasher';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { EmailPasswordAuthenticator } from './authenticators/email-password.authenticator';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenService } from './token/access-token.service';
import { JwtAccessTokenService } from './token/jwt-access-token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthSessionService } from './session/auth-session.service';
import { JwtRefreshTokenService } from './token/jwt-refresh-token.service';
import { RefreshTokenService } from './token/refresh-token.service';
@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailPasswordAuthenticator,
    JwtStrategy, // 需要由 Nest 创建，同时注入：ConfigService UsersService
    JwtAuthGuard, // 如果以后其他模块想注入或复用它，注册为 Provider 更清晰 像这样直接使用 @UseGuards(JwtAuthGuard)
    AuthSessionService,
    {
      provide: PasswordHasher,
      useClass: ArgonPasswordHasher, // 如果哪天改成：BcryptPasswordHasher 只需要useClass: BcryptPasswordHasher
    },
    {
      provide: AccessTokenService,
      useClass: JwtAccessTokenService,
    },
    {
      provide: RefreshTokenService,
      useClass: JwtRefreshTokenService,
    },
  ],

  exports: [AuthService, PasswordHasher, AccessTokenService, JwtAuthGuard],
})
export class AuthModule {}
