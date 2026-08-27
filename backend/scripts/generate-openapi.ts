import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

process.env.DATABASE_URL ??=
  'postgresql://openapi:openapi@127.0.0.1:5432/openapi';
process.env.REDIS_URL ??= 'redis://127.0.0.1:6379';
process.env.JWT_SECRET ??= 'openapi-generation-secret';
process.env.JWT_REFRESH_SECRET ??= 'openapi-generation-refresh-secret';

async function main() {
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../src/app.module');
  const { createOpenApiDocument } = await import('../src/openapi');
  const app = await NestFactory.create(AppModule, {
    logger: ['error'],
    abortOnError: false,
    preview: true,
  });
  const document = createOpenApiDocument(app);
  const outputPath = join(
    process.cwd(),
    '..',
    '.agent',
    'context',
    'api',
    'openapi.json',
  );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
