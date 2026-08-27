import { SetMetadata } from '@nestjs/common';

import type { PermissionCode } from '../types/permission-code';

export const REQUIRED_PERMISSION_KEY = 'required_department_permission';

export const RequirePermission = (permission: PermissionCode) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permission);
