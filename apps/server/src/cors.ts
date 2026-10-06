import type { CorsOptions } from "cors";

// Local development: the web app's dev server (Vite) and preview on any port.
const localOrigin = /^http:\/\/localhost:\d+$/;

/** Allows the staging web app and local development, with credentials for the session cookie. */
export function corsOptions(allowedOrigins: readonly string[]): CorsOptions {
  return {
    origin: (origin, callback) => {
      // Requests without an Origin header (curl, health checks) aren't cross-origin.
      callback(
        null,
        origin === undefined || allowedOrigins.includes(origin) || localOrigin.test(origin),
      );
    },
    credentials: true,
  };
}
