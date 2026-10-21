import { afterEach, describe, expect, it, vi } from "vitest";

import { createAuth } from "~/lib/auth";

/** A fetch that answers every request with `body` and `status`, and keeps the requests. */
function fakeFetch(status: number, body: object) {
  const requests: Request[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Request(input, init));
    return Response.json(body, { status });
  };
  return { fetch: fetch as typeof globalThis.fetch, requests };
}

describe("createAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("asks the api for a sign-in code, with the session cookie", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example");
    const { fetch, requests } = fakeFetch(200, { success: true });

    await createAuth(fetch).sendCode("parent@example.com");

    expect(requests[0]?.url).toBe("https://api.example/api/auth/email-otp/send-verification-otp");
    expect(requests[0]?.credentials).toBe("include");
    expect(await requests[0]?.json()).toEqual({ email: "parent@example.com", type: "sign-in" });
  });

  it.each([
    [400, "INVALID_OTP", "That code isn't right. Check it and try again."],
    [400, "OTP_EXPIRED", "That code no longer works. Send a new one."],
    [403, "TOO_MANY_ATTEMPTS", "That code no longer works. Send a new one."],
    [429, undefined, "Too many tries. Wait a while, then try again."],
    [500, undefined, "Something went wrong. Try again."],
  ])("rejects a %i %s with a message to show", async (status, code, message) => {
    const { fetch } = fakeFetch(status, { code, message: "from the api" });

    await expect(createAuth(fetch).signIn("parent@example.com", "123456")).rejects.toThrow(message);
  });

  it("fails every call, without calling the web app's own host, when the address is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // A production build made without the variable.
    vi.stubEnv("VITE_API_URL", "");
    vi.stubEnv("DEV", false);
    const { fetch, requests } = fakeFetch(200, { success: true });

    const auth = createAuth(fetch);

    await expect(auth.sendCode("parent@example.com")).rejects.toThrow("VITE_API_URL");
    await expect(auth.signOut()).rejects.toThrow("VITE_API_URL");
    expect(requests).toEqual([]);
  });
});
