import { Module } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-bases.service';
import { KnowledgeBaseController } from './knowledge-bases.controller';
import { AccessControlModule } from 'src/access-control/access-control.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { DepartmentsModule } from 'src/departments/departments.module';
import { KnowledgeBaseAccessService } from './knowledge-bases.access.service';

@Module({
  imports: [PrismaModule, AuthModule, AccessControlModule, DepartmentsModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService, KnowledgeBaseAccessService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
