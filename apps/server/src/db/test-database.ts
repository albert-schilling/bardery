import { readFile } from "node:fs/promises";

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const composeFile = new URL("../../../../docker-compose.yml", import.meta.url);

/** Starts a throwaway Postgres from the image that docker-compose.yml runs, so tests use what development uses. */
export async function startTestDatabase(): Promise<StartedPostgreSqlContainer> {
  const image = /image: (pgvector\/\S+)/.exec(await readFile(composeFile, "utf8"))?.[1];
  if (image === undefined) throw new Error("docker-compose.yml names no pgvector image");
  return new PostgreSqlContainer(image).start();
}
