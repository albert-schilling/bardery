import { describe, expect, it } from "vitest";

import { createAuth } from "~/auth";
import { loadConfig } from "~/config";
import { connectDatabase } from "~/db/client";
import { createSignInService } from "~/services/sign-in";

// Building Better Auth doesn't connect, so an unreachable database is enough.
const { db } = connectDatabase({ url: "postgres://bardery@127.0.0.1:1/bardery" });
const signIn = createSignInService({
  accounts: { findById: async () => undefined, existsWithEmail: async () => false },
  codeRequests: { record: async () => 1 },
  emailSender: { send: async () => {} },
  signUpAllowlist: [],
});
const deployed = {
  NODE_ENV: "production",
  API_URL: "https://api.staging.bardery.app",
  AUTH_SECRET: "a".repeat(32),
  COOKIE_DOMAIN: "staging.bardery.app",
};

describe("createAuth", () => {
  it("builds for a deployed server with a secret, an https address and a cookie domain", () => {
    expect(() => createAuth({ config: loadConfig(deployed), db, signIn })).not.toThrow();
  });

  it("refuses a deployed server without its own secret, naming the variable", () => {
    const config = loadConfig({ ...deployed, AUTH_SECRET: undefined });
    expect(() => createAuth({ config, db, signIn })).toThrow(/AUTH_SECRET/);
  });

  it("refuses a deployed server whose address isn't https, as its cookie wouldn't be Secure", () => {
    const config = loadConfig({ ...deployed, API_URL: "http://api.staging.bardery.app" });
    expect(() => createAuth({ config, db, signIn })).toThrow(/API_URL/);
  });

  it("refuses a deployed server without a cookie domain, naming the variable", () => {
    const config = loadConfig({ ...deployed, COOKIE_DOMAIN: undefined });
    expect(() => createAuth({ config, db, signIn })).toThrow(/COOKIE_DOMAIN/);
  });
});
