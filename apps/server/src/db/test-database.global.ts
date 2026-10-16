// Vitest global setup: one Postgres for the whole test run, so test files never start containers
// side by side. Each test makes its own database on it (test-database.ts).
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const container = await startPostgres();
  project.provide("postgresUrl", container.getConnectionUri());
  return async () => {
    await container.stop();
  };
}

async function startPostgres(): Promise<StartedPostgreSqlContainer> {
  // The image docker-compose.yml runs; docker compose finds the file in this folder or one above.
  const { stdout } = await promisify(execFile)("docker", ["compose", "config", "--images"], {
    cwd: import.meta.dirname,
  });
  const image = stdout.split("\n").find((line) => line.startsWith("pgvector/"));
  if (image === undefined) throw new Error("docker-compose.yml names no pgvector image");

  // Docker picks host ports from the range the OS also gives to outgoing connections, so a start
  // fails now and then with "address already in use"; another try gets another port.
  for (let attempt = 1; ; attempt++) {
    try {
      return await new PostgreSqlContainer(image).start();
    } catch (error) {
      if (attempt === 3 || !String(error).includes("address already in use")) throw error;
    }
  }
}

declare module "vitest" {
  export interface ProvidedContext {
    postgresUrl: string;
  }
}
