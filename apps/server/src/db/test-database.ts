import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

/** Starts a throwaway Postgres from the image that docker-compose.yml runs, so tests use what development uses. */
export async function startTestDatabase(): Promise<StartedPostgreSqlContainer> {
  // docker compose looks for docker-compose.yml here and in each folder above, up to the repo root.
  const { stdout } = await promisify(execFile)("docker", ["compose", "config", "--images"], {
    cwd: fileURLToPath(new URL(".", import.meta.url)),
  });
  const image = stdout.split("\n").find((line) => line.startsWith("pgvector/"));
  if (image === undefined) throw new Error("docker-compose.yml names no pgvector image");
  return new PostgreSqlContainer(image).start();
}
