import { afterEach, describe, expect, it } from "vitest";

import { type RunningServer, startServer } from "~/server";

// Nothing listens on port 1, so the database is unreachable at once.
const config = {
  PORT: 0,
  VERSION: "abc123",
  CORS_ORIGINS: [],
  DATABASE_URL: "postgres://bardery@127.0.0.1:1/bardery",
};

describe("the api server", () => {
  let server: RunningServer | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  it("answers GET /health with its status and version", async () => {
    server = await startServer(config);

    const response = await fetch(`http://localhost:${server.port}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", version: "abc123" });
  });

  it("answers the health procedure over tRPC, with the database's state", async () => {
    server = await startServer(config);

    const response = await fetch(`http://localhost:${server.port}/trpc/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      result: { data: { status: "ok", version: "abc123", database: "down" } },
    });
  });

  it.each([
    ["https://staging.bardery.app", true],
    ["http://localhost:5173", true],
    ["http://localhost:4000", false],
    ["https://evil.example", false],
  ])("CORS for origin %s: allowed %s, with credentials", async (origin, allowed) => {
    server = await startServer({
      ...config,
      CORS_ORIGINS: ["https://staging.bardery.app", "http://localhost:5173"],
    });

    const response = await fetch(`http://localhost:${server.port}/trpc/health`, {
      headers: { Origin: origin },
    });

    expect(response.headers.get("access-control-allow-origin")).toBe(allowed ? origin : null);
    if (allowed) expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("stops even while a client holds a keep-alive connection, and then refuses requests", async () => {
    const running = await startServer(config);
    const url = `http://localhost:${running.port}/health`;
    // fetch keeps the connection open for reuse.
    await fetch(url);

    await running.stop();

    await expect(fetch(url)).rejects.toThrow();
  });
});
