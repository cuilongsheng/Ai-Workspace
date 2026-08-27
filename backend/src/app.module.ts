import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { DepartmentsModule } from './departments/departments.module';
import { KnowledgeBaseModule } from './knowledge-bases/knowledge-bases.module';
import { DocumentsModule } from './documents/documents.module';
import { BullModule } from '@nestjs/bullmq';
import { RetrievalModule } from './retrieval/retrieval.module';
import { ChatModule } from './chat/chat.module';
import { AiModule } from './ai/ai.module';
import { PlatformOrganizationsModule } from './platform-organizations/platform-organizations.module';
import { OrganizationAdminModule } from './organization-admin/organization-admin.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    RedisModule,
    DepartmentsModule,
    KnowledgeBaseModule,
    DocumentsModule,
    RetrievalModule,
    AiModule,
    PlatformOrganizationsModule,
    OrganizationAdminModule,
    ChatModule,
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
