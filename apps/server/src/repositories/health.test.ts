import { expect, it } from "vitest";

import { connectDatabase } from "~/db/client";
import { startTestDatabase } from "~/db/test-database";
import { createHealthRepository } from "~/repositories/health";

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
