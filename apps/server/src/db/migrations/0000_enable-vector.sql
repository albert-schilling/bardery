-- pgvector, for the embeddings that semantic search uses (docs/adr/0002). On Azure it must be
-- allow-listed first (infra/envs/staging/database.tf).
CREATE EXTENSION IF NOT EXISTS vector;
