import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module';
import {
  PlatformDashboardController,
  PlatformOrganizationsController,
} from './platform-organizations.controller';
import { PlatformOrganizationsService } from './platform-organizations.service';
@Module({
  imports: [AccessControlModule],
  controllers: [PlatformOrganizationsController, PlatformDashboardController],
  providers: [PlatformOrganizationsService],
})
export class PlatformOrganizationsModule {}
