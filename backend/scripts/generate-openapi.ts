import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

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
