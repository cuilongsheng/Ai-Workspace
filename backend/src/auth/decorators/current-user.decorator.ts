import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthUser } from '../types/auth-user';

/**
 * 获取当前用户装饰器
 * @example
 * @CurrentUser() user: AuthUser
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
