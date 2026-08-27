/*
  Warnings:

  - A unique constraint covering the columns `[knowledgeBaseId,name]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Document_knowledgeBaseId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Document_active_knowledgeBaseId_name_key" ON "Document"("knowledgeBaseId", "name") WHERE ("status" != 'ARCHIVED');
