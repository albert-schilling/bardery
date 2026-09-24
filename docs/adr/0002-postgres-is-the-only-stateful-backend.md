# Postgres is the only stateful backend

One Postgres database holds the relational data, the embeddings for semantic search (pgvector), and the job queue for asynchronous generation work (image, audio, embeddings). We don't add a separate vector database, message broker or cache. This follows ADR 0001's aim of keeping the system small: there is one thing to back up, one place to delete an Account's data from (GDPR), and a Part and the jobs it triggers are committed in the same transaction. Media files (illustrations, Narrator audio) live in object storage, the only other stateful piece.

## Consequences

- Queue throughput and vector search both scale with Postgres. If either outgrows it, splitting it out should be recorded as a new ADR that supersedes this one.
- Workers poll the database for jobs, so at least one worker process must be running while jobs are pending.
