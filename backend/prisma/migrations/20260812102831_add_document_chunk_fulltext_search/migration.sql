-- This is an empty migration.
CREATE INDEX "DocumentChunk_content_fts_idx"
ON "DocumentChunk"
USING GIN (to_tsvector('simple', "content"));