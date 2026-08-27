/*
  Warnings:

  - A unique constraint covering the columns `[storageKey]` on the table `Document` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mimeType` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalName` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storageKey` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "originalName" TEXT NOT NULL,
ADD COLUMN     "size" INTEGER NOT NULL,
ADD COLUMN     "storageKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");
