import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { apiReference } from '@scalar/nestjs-api-reference';
import { createOpenApiDocument } from './openapi';
import { LocalizedExceptionFilter } from './i18n/localized-exception.filter';
import { resolveLocale } from './i18n/localize-message';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use((request, response, next) => {
    const locale = resolveLocale(request.headers['accept-language']);
    response.setHeader('Content-Language', locale);
    next();
  });

  const defaultCorsOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const allowedOrigins = (
    process.env.CORS_ORIGINS ?? defaultCorsOrigins.join(',')
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 删除 DTO 未声明的字段
      forbidNonWhitelisted: true, // 出现额外字段时直接报错
      transform: true, // 自动将输入数据转换为 DTO 中声明的类型
    }),
  );
  app.useGlobalFilters(new LocalizedExceptionFilter());
  const openapi = createOpenApiDocument(app);
  app.getHttpAdapter().get('/openapi.json', (_request, response) => {
    response.type('application/json').send(openapi);
  });
  app.use(
    '/docs',
    apiReference({
      url: '/openapi.json',
      pageTitle: 'AI Workspace API Reference',
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
