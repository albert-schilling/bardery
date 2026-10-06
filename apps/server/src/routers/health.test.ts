import { describe, expect, it } from "vitest";

import { appRouter } from "./index";

describe("health", () => {
  it("answers with its status and the running version", async () => {
    const caller = appRouter.createCaller({ version: "abc123" });

    expect(await caller.health()).toEqual({ status: "ok", version: "abc123" });
  });
});
