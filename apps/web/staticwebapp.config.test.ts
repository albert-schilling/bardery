import { describe, expect, it } from "vitest";

import config from "./public/staticwebapp.config.json";

describe("staticwebapp.config.json", () => {
  it("serves the SPA for any path, so reloading a deep link works", () => {
    expect(config.navigationFallback.rewrite).toBe("/index.html");
  });

  it("lets a missing asset return 404 instead of the SPA", () => {
    expect(config.navigationFallback.exclude).toContain("/assets/*");
  });
});
