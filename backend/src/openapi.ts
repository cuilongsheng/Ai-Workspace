import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** The public V1 contract; diagnostic controllers are deliberately excluded. */
export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('AI Workspace API')
    .setDescription('Production HTTP and SSE API for AI Workspace.')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearerAuth',
    )
    .addCookieAuth(
      'refresh_token',
      { type: 'apiKey', in: 'cookie' },
      'refreshCookie',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: false,
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });
  document.openapi = '3.1.0';
  return document;
}
