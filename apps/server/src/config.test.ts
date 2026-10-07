import { describe, expect, it } from "vitest";

import { ConfigError, loadConfig } from "~/config";

describe("loadConfig", () => {
  it("reads the port and version", () => {
    expect(loadConfig({ PORT: "8080", VERSION: "abc123" })).toEqual({
      PORT: 8080,
      VERSION: "abc123",
      CORS_ORIGINS: ["http://localhost:5173"],
      DATABASE_URL: "postgres://bardery:bardery@localhost:5432/bardery",
    });
  });

  it("defaults the port and version for local development", () => {
    expect(loadConfig({})).toEqual({
      PORT: 3000,
      VERSION: "dev",
      CORS_ORIGINS: ["http://localhost:5173"],
      DATABASE_URL: "postgres://bardery:bardery@localhost:5432/bardery",
    });
  });

  it("allows only the local web dev server by default, and nothing else once set", () => {
    expect(loadConfig({}).CORS_ORIGINS).toEqual(["http://localhost:5173"]);
    expect(loadConfig({ CORS_ORIGINS: "https://a.example" }).CORS_ORIGINS).toEqual([
      "https://a.example",
    ]);
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

  it("reads the database URL and the managed identity to sign in with", () => {
    const config = loadConfig({
      DATABASE_URL: "postgres://bardery-staging-api@db.example:5432/bardery?sslmode=verify-full",
      AZURE_CLIENT_ID: "00000000-0000-0000-0000-000000000001",
    });
    expect(config.DATABASE_URL).toBe(
      "postgres://bardery-staging-api@db.example:5432/bardery?sslmode=verify-full",
    );
    expect(config.AZURE_CLIENT_ID).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("rejects a database URL that isn't Postgres", () => {
    expect(() => loadConfig({ DATABASE_URL: "mysql://localhost/bardery" })).toThrow(/DATABASE_URL/);
  });

  it("rejects an empty version, as a build that didn't set it would have", () => {
    expect(() => loadConfig({ VERSION: "" })).toThrow(/VERSION/);
  });
});
