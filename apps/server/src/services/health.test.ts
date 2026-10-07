import { describe, expect, it } from "vitest";

import { createHealthService } from "~/services/health";

describe("the health service", () => {
  it.each([
    [true, "up"],
    [false, "down"],
  ])("with the database reachable %s, reports it %s", async (reachable, database) => {
    const service = createHealthService({
      repository: { isDatabaseReachable: async () => reachable },
      version: "abc123",
    });

    expect(await service.check()).toEqual({ status: "ok", version: "abc123", database });
  });
});
