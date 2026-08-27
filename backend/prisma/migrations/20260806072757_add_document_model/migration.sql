-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'PARSED', 'REVIEWING', 'PUBLISHED', 'FAILED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADING',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_knowledgeBaseId_status_idx" ON "Document"("knowledgeBaseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Document_knowledgeBaseId_name_key" ON "Document"("knowledgeBaseId", "name");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
