import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
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

const REQUIRED_ENV_KEYS = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MINIO_ENDPOINT',
  'MINIO_PORT',
  'MINIO_USE_SSL',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET',
] as const;

function validateEnvironment(config: Record<string, unknown>) {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || !value.trim();
  });

  if (missingKeys.length) {
    throw new Error(`Missing required env: ${missingKeys.join(', ')}`);
  }

  if (String(config.JWT_SECRET).length < 16) {
    throw new Error('JWT_SECRET must be at least 16 characters');
  }

  if (String(config.JWT_REFRESH_SECRET).length < 16) {
    throw new Error('JWT_REFRESH_SECRET must be at least 16 characters');
  }

  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
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
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = new URL(configService.getOrThrow<string>('REDIS_URL'));
        const redisDatabase = redisUrl.pathname.slice(1);

        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
            username: redisUrl.username
              ? decodeURIComponent(redisUrl.username)
              : undefined,
            password: redisUrl.password
              ? decodeURIComponent(redisUrl.password)
              : undefined,
            db: redisDatabase ? Number(redisDatabase) : undefined,
            tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
          },
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
