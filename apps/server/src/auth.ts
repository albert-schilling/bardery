import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";

import type { Config } from "~/config";
import type { Database } from "~/db/client";
import * as schema from "~/db/schema";
import { type SignInService, signInCodeLifetimeMinutes } from "~/services/sign-in";

// Signs cookies only on a developer's machine: a deployed server refuses to start without its own.
const developmentSecret = "bardery-development-secret-not-for-deployment";

/** Better Auth with email sign-in codes: the session cookie, and the `/api/auth/*` endpoints. */
export function createAuth(deps: { config: Config; db: Database; signIn: SignInService }) {
  const { config, signIn } = deps;
  if (config.NODE_ENV === "production" && config.AUTH_SECRET === undefined) {
    throw new Error("AUTH_SECRET is not set; a deployed server must sign cookies with its own.");
  }
  if (config.NODE_ENV === "production" && !config.API_URL.startsWith("https://")) {
    throw new Error("API_URL is not https; a deployed server's session cookie must be Secure.");
  }

  return betterAuth({
    baseURL: config.API_URL,
    secret: config.AUTH_SECRET ?? developmentSecret,
    // The web apps that may send requests with the session cookie.
    trustedOrigins: config.CORS_ORIGINS,
    database: drizzleAdapter(deps.db, { provider: "pg", schema }),
    // In the database, so every replica of the api counts together; on outside development too.
    rateLimit: { enabled: true, storage: "database" },
    advanced: {
      // The name includes the domain: prod's cookie, on bardery.app, also reaches staging's subdomains.
      cookiePrefix:
        config.COOKIE_DOMAIN === undefined ? "bardery" : `bardery-${config.COOKIE_DOMAIN}`,
      // Scoped to the parent domain, so the web app's requests to the api carry it.
      ...(config.COOKIE_DOMAIN !== undefined && {
        crossSubDomainCookies: { enabled: true, domain: config.COOKIE_DOMAIN },
      }),
      // Emails go out after the response, so its timing doesn't tell whether an address has an
      // Account. Better Auth logs a failed send; the reader asks for a new code.
      backgroundTasks: {
        handler: (task) => {
          task.catch((error: unknown) => console.error("background task failed:", error));
        },
      },
    },
    plugins: [
      emailOTP({
        expiresIn: signInCodeLifetimeMinutes * 60,
        allowedAttempts: 3,
        // A leaked database holds no usable codes.
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          // Only the sign-in endpoints are used; the others need no email.
          if (type === "sign-in") await signIn.sendCode(email, otp);
        },
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/email-otp/send-verification-otp") return;
        const email: unknown = ctx.body?.email;
        if (typeof email === "string" && !(await signIn.mayRequestCode(email))) {
          throw new APIError("TOO_MANY_REQUESTS", {
            message: "Too many codes for this email. Try again in an hour.",
          });
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          // Codes only go to addresses that may sign up, so this guards against a code that was
          // sent before the allowlist changed.
          async before(user) {
            if (!signIn.mayCreateAccount(user.email)) {
              throw new APIError("FORBIDDEN", { message: "This email can't create an Account." });
            }
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
