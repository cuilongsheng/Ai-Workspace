import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationAdminController } from './organization-admin.controller';
import { OrganizationAdminService } from './organization-admin.service';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationAdminController],
  providers: [OrganizationAdminService],
})
export class OrganizationAdminModule {}
