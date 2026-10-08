import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { expect, it } from "vitest";

import { connectDatabase } from "~/db/client";
import { startTestDatabase } from "~/db/test-database";
import { createHealthRepository } from "~/repositories/health";

const docker = (...args: string[]) => promisify(execFile)("docker", args);

it(
  "reports the database reachable while it runs, and unreachable once it stops",
  { timeout: 120_000 },
  async () => {
    const container = await startTestDatabase();
    const database = connectDatabase({ url: container.getConnectionUri() });
    const repository = createHealthRepository(database.db);
    try {
      expect(await repository.isDatabaseReachable()).toBe(true);

      await container.stop();

      expect(await repository.isDatabaseReachable()).toBe(false);
    } finally {
      await database.close();
    }
  },
);

// A paused container keeps its connections open but never answers, like a database during a failover
// or behind a dropped network: the query must time out instead of hanging.
it(
  "reports a database that stops answering as unreachable, and reachable once it answers again",
  { timeout: 120_000 },
  async () => {
    const container = await startTestDatabase();
    const database = connectDatabase({ url: container.getConnectionUri() });
    const repository = createHealthRepository(database.db);
    try {
      expect(await repository.isDatabaseReachable()).toBe(true);

      await docker("pause", container.getId());
      expect(await repository.isDatabaseReachable()).toBe(false);

      await docker("unpause", container.getId());
      expect(await repository.isDatabaseReachable()).toBe(true);
    } finally {
      await database.close();
      await container.stop();
    }
  },
);
