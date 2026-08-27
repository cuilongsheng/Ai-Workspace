-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL,
    "tokenCount" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");

-- CreateIndex
CREATE INDEX "DocumentChunk_knowledgeBaseId_idx" ON "DocumentChunk"("knowledgeBaseId");

-- CreateIndex
CREATE INDEX "DocumentChunk_departmentId_idx" ON "DocumentChunk"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChunk_documentId_chunkIndex_key" ON "DocumentChunk"("documentId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
