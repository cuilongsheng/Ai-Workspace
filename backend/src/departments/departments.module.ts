import { Module } from '@nestjs/common';

import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

@Module({
  imports: [AuthModule, AccessControlModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
