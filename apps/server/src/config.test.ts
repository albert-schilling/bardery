import { describe, expect, it } from "vitest";

import { ConfigError, loadConfig } from "~/config";

describe("loadConfig", () => {
  it("reads the port and version", () => {
    expect(loadConfig({ PORT: "8080", VERSION: "abc123" })).toEqual({
      PORT: 8080,
      VERSION: "abc123",
      CORS_ORIGINS: ["http://localhost:5173"],
      DATABASE_URL: "postgres://bardery:bardery@localhost:5432/bardery",
      EMAIL_FROM: "noreply@mail.bardery.app",
      SMTP_URL: "smtp://localhost:1025",
      API_URL: "http://localhost:3000",
      SIGN_UP_ALLOWLIST: [],
    });
  });

  it("defaults the port and version for local development", () => {
    expect(loadConfig({})).toEqual({
      PORT: 3000,
      VERSION: "dev",
      CORS_ORIGINS: ["http://localhost:5173"],
      DATABASE_URL: "postgres://bardery:bardery@localhost:5432/bardery",
      EMAIL_FROM: "noreply@mail.bardery.app",
      SMTP_URL: "smtp://localhost:1025",
      API_URL: "http://localhost:3000",
      SIGN_UP_ALLOWLIST: [],
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

  it("sends from noreply@mail.bardery.app, through Mailpit unless an Azure endpoint is set", () => {
    const config = loadConfig({});
    expect(config.EMAIL_FROM).toBe("noreply@mail.bardery.app");
    expect(config.AZURE_COMMUNICATION_ENDPOINT).toBeUndefined();
    expect(
      loadConfig({ AZURE_COMMUNICATION_ENDPOINT: "https://bardery.europe.communication.azure.com" })
        .AZURE_COMMUNICATION_ENDPOINT,
    ).toBe("https://bardery.europe.communication.azure.com");
  });

  it("rejects an invalid sender or endpoint, naming the variable", () => {
    expect(() => loadConfig({ EMAIL_FROM: "nobody" })).toThrow(/EMAIL_FROM/);
    expect(() => loadConfig({ AZURE_COMMUNICATION_ENDPOINT: "http://x.example" })).toThrow(
      /AZURE_COMMUNICATION_ENDPOINT/,
    );
  });

  it("reads the sign-in settings, with the allowlist split and in lower case", () => {
    const config = loadConfig({
      API_URL: "https://api.staging.bardery.app",
      AUTH_SECRET: "a".repeat(32),
      COOKIE_DOMAIN: "staging.bardery.app",
      SIGN_UP_ALLOWLIST: "Parent@Example.com, other@example.com",
    });
    expect(config).toMatchObject({
      API_URL: "https://api.staging.bardery.app",
      AUTH_SECRET: "a".repeat(32),
      COOKIE_DOMAIN: "staging.bardery.app",
      SIGN_UP_ALLOWLIST: ["parent@example.com", "other@example.com"],
    });
  });

  it("rejects a short secret, naming the variable", () => {
    expect(() => loadConfig({ AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });

  it("rejects an empty version, as a build that didn't set it would have", () => {
    expect(() => loadConfig({ VERSION: "" })).toThrow(/VERSION/);
  });
});
