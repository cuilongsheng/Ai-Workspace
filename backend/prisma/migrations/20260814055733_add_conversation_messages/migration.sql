-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'STREAMING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'COMPLETED',
    "content" TEXT NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageCitation" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentChunkId" TEXT NOT NULL,
    "sourceNumber" INTEGER NOT NULL,
    "documentName" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "quote" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "retrievalScore" DOUBLE PRECISION NOT NULL,
    "rerankScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageCitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_organizationId_departmentId_userId_updatedAt_idx" ON "Conversation"("organizationId", "departmentId", "userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Conversation_knowledgeBaseId_userId_updatedAt_idx" ON "Conversation"("knowledgeBaseId", "userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageCitation_documentId_idx" ON "MessageCitation"("documentId");

-- CreateIndex
CREATE INDEX "MessageCitation_documentChunkId_idx" ON "MessageCitation"("documentChunkId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageCitation_messageId_sourceNumber_key" ON "MessageCitation"("messageId", "sourceNumber");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageCitation" ADD CONSTRAINT "MessageCitation_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageCitation" ADD CONSTRAINT "MessageCitation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageCitation" ADD CONSTRAINT "MessageCitation_documentChunkId_fkey" FOREIGN KEY ("documentChunkId") REFERENCES "DocumentChunk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
