-- Add use_rag flag to project (when true, use vector search instead of full context)
-- This runs on all environments (local + Neon).
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "use_rag" BOOLEAN NOT NULL DEFAULT false;

-- RAG + pgvector: only run when the vector extension is available (e.g. Neon).
-- Local Postgres without pgvector will skip this block; migrate dev will succeed.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS "knowledge_chunk" (
      "id" TEXT NOT NULL,
      "project_id" TEXT NOT NULL,
      "project_knowledge_id" TEXT,
      "content" TEXT NOT NULL,
      "embedding" vector(768),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "knowledge_chunk_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "knowledge_chunk_project_id_idx" ON "knowledge_chunk"("project_id");

    CREATE INDEX IF NOT EXISTS "knowledge_chunk_embedding_idx" ON "knowledge_chunk"
    USING hnsw ("embedding" vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

    ALTER TABLE "knowledge_chunk" DROP CONSTRAINT IF EXISTS "knowledge_chunk_project_id_fkey";
    ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    ALTER TABLE "knowledge_chunk" DROP CONSTRAINT IF EXISTS "knowledge_chunk_project_knowledge_id_fkey";
    ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_project_knowledge_id_fkey"
      FOREIGN KEY ("project_knowledge_id") REFERENCES "project_knowledge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
