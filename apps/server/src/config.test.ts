import { describe, expect, it } from "vitest";

import { ConfigError, loadConfig } from "~/config";

describe("loadConfig", () => {
  it("reads the port and version", () => {
    expect(loadConfig({ PORT: "8080", VERSION: "abc123" })).toEqual({
      PORT: 8080,
      VERSION: "abc123",
      CORS_ORIGINS: [],
    });
  });

  it("defaults the port and version for local development", () => {
    expect(loadConfig({})).toEqual({ PORT: 3000, VERSION: "dev", CORS_ORIGINS: [] });
  });

  it("splits the allowed CORS origins at commas", () => {
    expect(
      loadConfig({ CORS_ORIGINS: "https://a.example, https://b.example" }).CORS_ORIGINS,
    ).toEqual(["https://a.example", "https://b.example"]);
  });

  it("rejects an invalid port, naming the variable", () => {
    expect(() => loadConfig({ PORT: "eighty" })).toThrow(ConfigError);
    expect(() => loadConfig({ PORT: "eighty" })).toThrow(/PORT/);
  });

  it("rejects an empty version, as a build that didn't set it would have", () => {
    expect(() => loadConfig({ VERSION: "" })).toThrow(/VERSION/);
  });
});
