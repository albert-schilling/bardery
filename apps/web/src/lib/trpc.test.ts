import { afterEach, describe, expect, it, vi } from "vitest";

import { createApiClient } from "~/lib/trpc";

/** The messages of an error and of its chain of causes: tRPC wraps the failed fetch. */
function reasons(error: unknown): string {
  const messages: string[] = [];
  for (let current = error; current instanceof Error; current = current.cause) {
    messages.push(current.message);
  }
  return messages.join(" <- ");
}

describe("createApiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("calls the api without doubling a trailing slash", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      urls.push(input instanceof Request ? input.url : input.toString());
      return Response.json([{ result: { data: { status: "ok", version: "x" } } }]);
    });

    vi.stubEnv("VITE_API_URL", "https://api.example/");

    await createApiClient().health.query();

    expect(urls[0]).toMatch(/^https:\/\/api\.example\/trpc\/health/);
  });

  it("fails each call, without throwing on creation, when the address is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    // A production build made without the variable.
    vi.stubEnv("VITE_API_URL", "");
    vi.stubEnv("DEV", false);

    const client = createApiClient();

    const error = await client.health.query().catch((caught: unknown) => caught);

    expect(reasons(error)).toContain("VITE_API_URL");
  });
});
