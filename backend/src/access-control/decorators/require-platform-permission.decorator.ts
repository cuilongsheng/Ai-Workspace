import { SetMetadata } from '@nestjs/common';

import type { PermissionCode } from '../types/permission-code';

export const REQUIRED_PLATFORM_PERMISSION_KEY = 'required_platform_permission';

export const RequirePlatformPermission = (permission: PermissionCode) =>
  SetMetadata(REQUIRED_PLATFORM_PERMISSION_KEY, permission);
