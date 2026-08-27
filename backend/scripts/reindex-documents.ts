import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DocumentIndexingService } from '../src/document-processing/document-indexing.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const indexing = app.get(DocumentIndexingService);

  try {
    const requestedIds = process.argv
      .slice(2)
      .filter((arg) => !arg.startsWith('-'));
    const documents = await prisma.document.findMany({
      where: {
        status: 'PUBLISHED',
        ...(requestedIds.length ? { id: { in: requestedIds } } : {}),
        chunks: {
          some: {
            isActive: true,
            indexVersion: { lt: 2 },
          },
        },
      },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Reindexing ${documents.length} published document(s)`);
    for (const [index, document] of documents.entries()) {
      console.log(`[${index + 1}/${documents.length}] ${document.name}`);
      const result = await indexing.rebuild(document.id);
      console.log(result);
    }
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
