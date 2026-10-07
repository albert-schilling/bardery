import { describe, expect, it } from "vitest";

import { healthSchema } from "./health";

describe("healthSchema", () => {
  it("accepts an ok status with a version and the database's state", () => {
    for (const database of ["up", "down"]) {
      const health = { status: "ok", version: "abc123", database };
      expect(healthSchema.parse(health)).toEqual(health);
    }
  });

  it("rejects another status, an empty version and an unknown database state", () => {
    const health = { status: "ok", version: "abc123", database: "up" };
    expect(healthSchema.safeParse({ ...health, status: "down" }).success).toBe(false);
    expect(healthSchema.safeParse({ ...health, version: "" }).success).toBe(false);
    expect(healthSchema.safeParse({ ...health, database: "slow" }).success).toBe(false);
  });
});
