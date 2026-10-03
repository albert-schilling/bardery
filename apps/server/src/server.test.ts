import { afterEach, describe, expect, it } from "vitest";

import { type RunningServer, startServer } from "~/server";

describe("the api server", () => {
  let server: RunningServer | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  it("answers GET /health with its status and version", async () => {
    server = await startServer({ PORT: 0, VERSION: "abc123" });

    const response = await fetch(`http://localhost:${server.port}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", version: "abc123" });
  });

  it("stops even while a client holds a keep-alive connection, and then refuses requests", async () => {
    const running = await startServer({ PORT: 0, VERSION: "abc123" });
    const url = `http://localhost:${running.port}/health`;
    // fetch keeps the connection open for reuse.
    await fetch(url);

    await running.stop();

    await expect(fetch(url)).rejects.toThrow();
  });
});
