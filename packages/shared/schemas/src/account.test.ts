import { describe, expect, it } from "vitest";

import { accountSchema } from "./account";

describe("accountSchema", () => {
  it("accepts an ID and an email", () => {
    const account = { id: "a1", email: "parent@example.com" };
    expect(accountSchema.parse(account)).toEqual(account);
  });

  it("rejects an empty ID and an invalid email", () => {
    expect(accountSchema.safeParse({ id: "", email: "parent@example.com" }).success).toBe(false);
    expect(accountSchema.safeParse({ id: "a1", email: "parent" }).success).toBe(false);
  });
});
