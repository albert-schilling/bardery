import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { inject } from "vitest";

export interface TestDatabase {
  url: string;
  drop(): Promise<void>;
}

/** Creates an empty database on the test run's Postgres (test-database.global.ts), for one test. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const serverUrl = inject("postgresUrl");
  const name = `test_${randomUUID().replaceAll("-", "")}`;
  await onServer(serverUrl, `create database "${name}"`);
  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  return {
    url: url.toString(),
    drop: () => onServer(serverUrl, `drop database "${name}" with (force)`),
  };
}

async function onServer(serverUrl: string, statement: string): Promise<void> {
  const client = new Client({ connectionString: serverUrl });
  await client.connect();
  try {
    await client.query(statement);
  } finally {
    await client.end();
  }
}
