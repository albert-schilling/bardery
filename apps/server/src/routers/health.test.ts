import { describe, expect, it } from "vitest";

import { appRouter } from "~/routers";
import { createHealthService } from "~/services/health";

describe("health", () => {
  it("answers with its status, the running version and the database's state", async () => {
    const health = createHealthService({
      repository: { isDatabaseReachable: async () => true },
      version: "abc123",
    });
    const caller = appRouter.createCaller({ services: { health } });

    expect(await caller.health()).toEqual({ status: "ok", version: "abc123", database: "up" });
  });
});
