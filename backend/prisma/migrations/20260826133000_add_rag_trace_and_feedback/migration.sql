CREATE TABLE "RagTrace" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "diagnostics" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RagTrace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageFeedback" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "helpful" BOOLEAN NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessageFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RagTrace_messageId_key" ON "RagTrace"("messageId");
CREATE INDEX "RagTrace_status_createdAt_idx" ON "RagTrace"("status", "createdAt");
CREATE UNIQUE INDEX "MessageFeedback_messageId_userId_key" ON "MessageFeedback"("messageId", "userId");
CREATE INDEX "MessageFeedback_helpful_createdAt_idx" ON "MessageFeedback"("helpful", "createdAt");

ALTER TABLE "RagTrace" ADD CONSTRAINT "RagTrace_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageFeedback" ADD CONSTRAINT "MessageFeedback_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageFeedback" ADD CONSTRAINT "MessageFeedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
