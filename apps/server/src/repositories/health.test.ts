import { expect, inject, it } from "vitest";

import { connectDatabase } from "~/db/client";
import { startTestProxy } from "~/db/test-proxy";
import { createHealthRepository } from "~/repositories/health";

// The proxy breaks the connection to the test run's shared Postgres without stopping it.

it("reports the database reachable while it runs, and unreachable once it is gone", async () => {
  const proxy = await startTestProxy(inject("postgresUrl"));
  const database = connectDatabase({ url: proxy.url });
  const repository = createHealthRepository(database.db);
  try {
    expect(await repository.isDatabaseReachable()).toBe(true);

    await proxy.close();

    expect(await repository.isDatabaseReachable()).toBe(false);
  } finally {
    await database.close();
  }
});

// Like a database during a failover, or behind a dropped network: the connection stays open but
// nothing comes back, so the query must time out instead of hanging.
it(
  "reports a database that stops answering as unreachable, and reachable once it answers again",
  { timeout: 30_000 },
  async () => {
    const proxy = await startTestProxy(inject("postgresUrl"));
    const database = connectDatabase({ url: proxy.url });
    const repository = createHealthRepository(database.db);
    try {
      expect(await repository.isDatabaseReachable()).toBe(true);

      proxy.pause();
      expect(await repository.isDatabaseReachable()).toBe(false);

      proxy.resume();
      expect(await repository.isDatabaseReachable()).toBe(true);
    } finally {
      await database.close();
      await proxy.close();
    }
  },
);
