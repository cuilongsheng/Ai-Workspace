-- This is an empty migration.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "DocumentChunk_content_trgm_idx"
ON "DocumentChunk"
USING GIN ("content" gin_trgm_ops);