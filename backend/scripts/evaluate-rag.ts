import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RetrievalService } from '../src/retrieval/retrieval.service';

interface EvaluationDataset {
  documentName: string;
  templates: string[];
  entities: string[];
  noMatchCases: string[];
}

async function main() {
  const dataset = JSON.parse(
    readFileSync(join(process.cwd(), 'evaluation/rag-v1.json'), 'utf8'),
  ) as EvaluationDataset;
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const runLimit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const retrieval = app.get(RetrievalService);

  try {
    const document = await prisma.document.findFirst({
      where: { name: dataset.documentName, status: 'PUBLISHED' },
      select: {
        organizationId: true,
        departmentId: true,
        knowledgeBaseId: true,
      },
    });
    if (!document)
      throw new Error(`Published fixture not found: ${dataset.documentName}`);
    const positiveCases = dataset.entities.flatMap((entity) =>
      dataset.templates.map((template) => ({
        query: template.replace('{entity}', entity),
        expectedSection: entity,
        expectedStatus: 'grounded' as const,
      })),
    );
    const cases = [
      ...positiveCases,
      ...dataset.noMatchCases.map((query) => ({
        query,
        expectedSection: null,
        expectedStatus: 'no_match' as const,
      })),
    ].slice(0, runLimit);

    let hits = 0;
    let reciprocalRank = 0;
    let statusHits = 0;
    let groundedWithSources = 0;
    const failures: unknown[] = [];
    const latencies: number[] = [];
    for (const [index, testCase] of cases.entries()) {
      const startedAt = performance.now();
      const outcome = await retrieval.searchDetailed(testCase.query, document, {
        limit: 5,
      });
      latencies.push(performance.now() - startedAt);
      const rank = testCase.expectedSection
        ? outcome.results.findIndex(
            (result) => result.sectionTitle === testCase.expectedSection,
          ) + 1
        : 0;
      if (rank > 0) {
        hits += 1;
        reciprocalRank += 1 / rank;
      }
      if (outcome.status === testCase.expectedStatus) statusHits += 1;
      if (outcome.status === 'grounded' && outcome.results.length > 0) {
        groundedWithSources += 1;
      }
      if (
        outcome.status !== testCase.expectedStatus ||
        (testCase.expectedSection && rank === 0)
      ) {
        failures.push({
          index: index + 1,
          query: testCase.query,
          expectedStatus: testCase.expectedStatus,
          actualStatus: outcome.status,
          expectedSection: testCase.expectedSection,
          actualSections: outcome.results.map((result) => result.sectionTitle),
        });
      }
      console.log(
        `[${index + 1}/${cases.length}] ${outcome.status} ${testCase.query}`,
      );
    }

    const positiveCount = cases.filter((item) => item.expectedSection).length;
    const sortedLatency = [...latencies].sort((a, b) => a - b);
    const report = {
      cases: cases.length,
      recallAt5: positiveCount ? hits / positiveCount : 0,
      mrr: positiveCount ? reciprocalRank / positiveCount : 0,
      statusAccuracy: cases.length ? statusHits / cases.length : 0,
      groundedSourceCoverage: positiveCount
        ? groundedWithSources / positiveCount
        : 0,
      latencyMs: {
        average: Math.round(
          latencies.reduce((sum, value) => sum + value, 0) /
            Math.max(latencies.length, 1),
        ),
        p95: Math.round(
          sortedLatency[
            Math.max(0, Math.ceil(sortedLatency.length * 0.95) - 1)
          ] ?? 0,
        ),
      },
      failures,
    };
    console.log('\nRAG_EVALUATION_REPORT');
    console.log(JSON.stringify(report, null, 2));
    if (failures.length) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
