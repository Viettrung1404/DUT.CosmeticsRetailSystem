-- Enable pgvector extension for semantic similarity search on Neon PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- Use halfvec(1024) (float16) to cut RAM/storage by 50% on Neon 0.25 CU Free Tier
ALTER TABLE "products"
    ADD COLUMN IF NOT EXISTS "embedding" halfvec(1024),
    ADD COLUMN IF NOT EXISTS "embedding_model" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "embedding_updated_at" TIMESTAMPTZ;

-- HNSW index tuned for cosine distance (<=>)
CREATE INDEX IF NOT EXISTS "idx_products_embedding_hnsw"
    ON "products" USING hnsw ("embedding" halfvec_cosine_ops);
