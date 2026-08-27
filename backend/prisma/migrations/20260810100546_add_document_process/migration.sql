-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "DocumentProcess" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" "ProcessStatus" NOT NULL,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentProcess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentProcess_documentId_idx" ON "DocumentProcess"("documentId");

-- AddForeignKey
ALTER TABLE "DocumentProcess" ADD CONSTRAINT "DocumentProcess_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
