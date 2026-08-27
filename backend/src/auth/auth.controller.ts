import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { CookieOptions, Response } from 'express';

import { REFRESH_TOKEN_COOKIE_NAME } from './auth.constants';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthUser } from './types/auth-user';
import type { RequestWithCookies } from './types/request-with-cookies';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ operationId: 'Auth_login' })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const result = await this.authService.login(dto);

    this.setRefreshTokenCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresIn,
    );

    const {
      refreshToken: _refreshToken,
      refreshTokenExpiresIn: _refreshTokenExpiresIn,
      ...publicResult
    } = result;

    return publicResult;
  }

  @Post('refresh')
  @ApiOperation({ operationId: 'Auth_refresh' })
  @ApiCookieAuth('refreshCookie')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const result = await this.authService.refresh(refreshToken);

    this.setRefreshTokenCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresIn,
    );

    const {
      refreshToken: _refreshToken,
      refreshTokenExpiresIn: _refreshTokenExpiresIn,
      ...publicResult
    } = result;

    return publicResult;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ operationId: 'Auth_getCurrentUser' })
  @ApiBearerAuth('bearerAuth')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getCurrentUser(user.id);
  }

  private setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
    expiresInSeconds: number,
  ): void {
    const options: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: expiresInSeconds * 1000,
    };

    response.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, options);
  }
  @Post('logout')
  @ApiOperation({ operationId: 'Auth_logout' })
  @ApiCookieAuth('refreshCookie')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true })
    response: Response,
  ): Promise<void> {
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME];

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.clearRefreshTokenCookie(response);
  }
  private clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
    });
  }
}
