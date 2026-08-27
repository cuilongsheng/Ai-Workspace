ALTER TABLE "DocumentChunk"
  ADD COLUMN "sectionIndex" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sectionTitle" TEXT,
  ADD COLUMN "chunkInSection" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "indexVersion" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "DocumentChunk_documentId_isActive_sectionIndex_chunkInSection_idx"
  ON "DocumentChunk"("documentId", "isActive", "sectionIndex", "chunkInSection");
