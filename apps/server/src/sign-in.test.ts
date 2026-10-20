import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type Config, loadConfig } from "~/config";
import { connectDatabase } from "~/db/client";
import { session } from "~/db/schema";
import { createTestDatabase, migrateTestDatabase, type TestDatabase } from "~/db/test-database";
import type { Email, EmailSender } from "~/providers/email-sender";
import { type RunningServer, startServer } from "~/server";

const allowed = "parent@example.com";
const webApp = "http://localhost:5173";

/** Keeps the emails the server sends, so a test can read the codes in them. */
function fakeEmailSender() {
  const sent: Email[] = [];
  const sender: EmailSender = {
    async send(email) {
      sent.push(email);
    },
  };
  return {
    sender,
    sent,
    /** The code in the latest email to `to`; it may arrive just after the response that sent it. */
    async codeFor(to: string): Promise<string> {
      for (let attempt = 0; attempt < 50; attempt++) {
        const email = sent.findLast((each) => each.to === to);
        const code = email?.text.match(/\b\d{6}\b/)?.[0];
        if (code !== undefined) return code;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error(`no code was sent to ${to}`);
    },
  };
}

let testDatabase: TestDatabase;
let server: RunningServer | undefined;
let emails: ReturnType<typeof fakeEmailSender>;
let url: string;

async function start(env: Record<string, string> = {}): Promise<void> {
  await server?.stop();
  // Port 0 picks a free one; the config accepts only real ports.
  const config: Config = {
    ...loadConfig({ DATABASE_URL: testDatabase.url, SIGN_UP_ALLOWLIST: allowed, ...env }),
    PORT: 0,
  };
  emails = fakeEmailSender();
  server = await startServer(config, emails.sender);
  url = `http://localhost:${server.port}`;
}

beforeEach(async () => {
  testDatabase = await createTestDatabase();
  await migrateTestDatabase(testDatabase.url);
});

afterEach(async () => {
  await server?.stop();
  server = undefined;
  await testDatabase.drop();
});

/** A request as the web app sends it: from its origin, with the session cookie if there is one. */
function call(path: string, options: { body?: object; cookie?: string; ip?: string } = {}) {
  return fetch(`${url}${path}`, {
    method: options.body === undefined ? "GET" : "POST",
    headers: {
      Origin: webApp,
      "Content-Type": "application/json",
      ...(options.cookie !== undefined && { Cookie: options.cookie }),
      ...(options.ip !== undefined && { "X-Forwarded-For": options.ip }),
    },
    ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
  });
}

const requestCode = (email: string, ip?: string) =>
  call("/api/auth/email-otp/send-verification-otp", {
    body: { email, type: "sign-in" },
    ...(ip !== undefined && { ip }),
  });

const signIn = (email: string, otp: string, ip?: string) =>
  call("/api/auth/sign-in/email-otp", { body: { email, otp }, ...(ip !== undefined && { ip }) });

/** The `name=value` part of the session cookie a response sets. */
function sessionCookie(response: Response): string {
  const cookie = response.headers.getSetCookie().find((each) => each.includes("session_token="));
  if (cookie === undefined) throw new Error("no session cookie was set");
  return cookie.split(";")[0] ?? "";
}

describe("signing in with an email code", () => {
  it("emails a code, signs in with it, answers `me`, and signs out", async () => {
    await start();

    expect((await requestCode("Parent@Example.com")).status).toBe(200);
    const signedIn = await signIn(allowed, await emails.codeFor(allowed));
    expect(signedIn.status).toBe(200);
    const cookie = sessionCookie(signedIn);

    const me = await call("/trpc/me", { cookie });
    expect(await me.json()).toEqual({
      result: { data: { id: expect.any(String), email: allowed } },
    });

    expect((await call("/api/auth/sign-out", { body: {}, cookie })).status).toBe(200);
    expect((await call("/trpc/me", { cookie })).status).toBe(401);
  });

  it("renews a session in use, and passes the renewed cookie on", async () => {
    await start();
    await requestCode(allowed);
    const cookie = sessionCookie(await signIn(allowed, await emails.codeFor(allowed)));
    // A session signed in to six days ago: due for renewal, which happens once a day.
    const database = connectDatabase({ url: testDatabase.url });
    await database.db.update(session).set({ expiresAt: new Date(Date.now() + 86_400_000) });
    await database.close();

    const me = await call("/trpc/me", { cookie });

    expect(me.status).toBe(200);
    expect(sessionCookie(me)).toBe(cookie);
    expect(me.headers.getSetCookie()[0]).toMatch(/Max-Age=604800/);
  });

  it("refuses `me` without a session", async () => {
    await start();

    const response = await call("/trpc/me");

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { data: { code: "UNAUTHORIZED" } } });
  });

  it("sends no code to an email that has no Account and isn't on the allowlist", async () => {
    await start();

    expect((await requestCode("stranger@example.com")).status).toBe(200);
    await expect(emails.codeFor("stranger@example.com")).rejects.toThrow(/no code/);
  });

  it("lets an Account sign in after its email has left the allowlist", async () => {
    await start();
    await requestCode(allowed);
    await signIn(allowed, await emails.codeFor(allowed));

    await start({ SIGN_UP_ALLOWLIST: "" });
    await requestCode(allowed);

    expect((await signIn(allowed, await emails.codeFor(allowed))).status).toBe(200);
  });

  it("creates no Account with a code sent before its email left the allowlist", async () => {
    await start();
    await requestCode(allowed);
    const code = await emails.codeFor(allowed);

    await start({ SIGN_UP_ALLOWLIST: "" });

    expect((await signIn(allowed, code)).status).toBe(403);
  });

  it("accepts a code only once", async () => {
    await start();
    await requestCode(allowed);
    const code = await emails.codeFor(allowed);

    expect((await signIn(allowed, code)).status).toBe(200);
    expect((await signIn(allowed, code)).status).toBe(400);
  });

  it("locks a code after three wrong attempts", async () => {
    await start();
    await requestCode(allowed);
    const code = await emails.codeFor(allowed);
    const wrong = code === "000000" ? "111111" : "000000";

    // From different IP addresses, so the per-address limit doesn't stop them first.
    for (const ip of ["203.0.113.1", "203.0.113.2", "203.0.113.3"]) {
      expect((await signIn(allowed, wrong, ip)).status).toBe(400);
    }
    const right = await signIn(allowed, code, "203.0.113.4");

    expect(right.status).toBe(403);
    expect(await right.json()).toMatchObject({ code: "TOO_MANY_ATTEMPTS" });
  });

  it("limits codes per IP address", async () => {
    await start();

    const statuses = [];
    for (const name of ["a", "b", "c", "d"]) {
      statuses.push((await requestCode(`${name}@example.com`, "203.0.113.1")).status);
    }

    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it("limits codes per email, whichever IP address asks", async () => {
    await start();

    const statuses = [];
    for (let request = 1; request <= 6; request++) {
      statuses.push((await requestCode(allowed, `203.0.113.${request}`)).status);
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it("sets a Secure, HttpOnly, SameSite=Lax session cookie on the configured domain", async () => {
    await start({
      API_URL: "https://api.staging.bardery.app",
      COOKIE_DOMAIN: "staging.bardery.app",
      CORS_ORIGINS: webApp,
    });
    await requestCode(allowed);

    const signedIn = await signIn(allowed, await emails.codeFor(allowed));

    const cookie = signedIn.headers.getSetCookie().find((each) => each.includes("session_token="));
    expect(cookie).toMatch(/^__Secure-bardery-staging\.bardery\.app\.session_token=/);
    expect(cookie).toMatch(/; Secure/i);
    expect(cookie).toMatch(/; HttpOnly/i);
    expect(cookie).toMatch(/; SameSite=Lax/i);
    expect(cookie).toMatch(/; Domain=staging\.bardery\.app/i);
  });
});
