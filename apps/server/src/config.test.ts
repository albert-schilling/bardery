import { describe, expect, it } from "vitest";

import { ConfigError, loadConfig } from "~/config";

describe("loadConfig", () => {
  it("reads the port and version", () => {
    expect(loadConfig({ PORT: "8080", VERSION: "abc123" })).toEqual({
      PORT: 8080,
      VERSION: "abc123",
    });
  });

  it("defaults the port and version for local development", () => {
    expect(loadConfig({})).toEqual({ PORT: 3000, VERSION: "dev" });
  });

  it("rejects an invalid port, naming the variable", () => {
    expect(() => loadConfig({ PORT: "eighty" })).toThrow(ConfigError);
    expect(() => loadConfig({ PORT: "eighty" })).toThrow(/PORT/);
  });

  it("rejects an empty version, as a build that didn't set it would have", () => {
    expect(() => loadConfig({ VERSION: "" })).toThrow(/VERSION/);
  });
});
