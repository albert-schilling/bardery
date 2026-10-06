import { describe, expect, it } from "vitest";

import { healthSchema } from "./health";

describe("healthSchema", () => {
  it("accepts an ok status with a version", () => {
    expect(healthSchema.parse({ status: "ok", version: "abc123" })).toEqual({
      status: "ok",
      version: "abc123",
    });
  });

  it("rejects another status and an empty version", () => {
    expect(healthSchema.safeParse({ status: "down", version: "abc123" }).success).toBe(false);
    expect(healthSchema.safeParse({ status: "ok", version: "" }).success).toBe(false);
  });
});
