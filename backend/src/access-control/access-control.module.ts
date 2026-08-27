import { Module } from '@nestjs/common';

import { DepartmentAccessService } from './department-access.service';
import { ResourcePermissionGuard } from './guards/resource-permission.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';

@Module({
  providers: [
    DepartmentAccessService,
    ResourcePermissionGuard,
    PlatformPermissionGuard,
  ],
  exports: [
    DepartmentAccessService,
    ResourcePermissionGuard,
    PlatformPermissionGuard,
  ],
})
export class AccessControlModule {}
