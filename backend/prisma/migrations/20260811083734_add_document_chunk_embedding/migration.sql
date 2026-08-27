CREATE EXTENSION IF NOT EXISTS vector;
-- AlterTable
ALTER TABLE "DocumentChunk" ADD COLUMN     "embedding" vector(1024),
ADD COLUMN     "embeddingModel" TEXT;
