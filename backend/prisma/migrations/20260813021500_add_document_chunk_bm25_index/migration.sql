-- This is an empty migration.

CREATE EXTENSION IF NOT EXISTS pg_search CASCADE;

CREATE INDEX "DocumentChunk_bm25_idx"
ON "DocumentChunk"
USING bm25 (
  "id",
  ("content"::pdb.jieba),
  "organizationId",
  "departmentId",
  "knowledgeBaseId"
)
WITH (
  key_field = 'id'
);