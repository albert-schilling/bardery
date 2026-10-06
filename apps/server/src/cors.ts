import type { CorsOptions } from "cors";

/** Allows exactly the listed web origins, with credentials for the session cookie. */
export function corsOptions(allowedOrigins: readonly string[]): CorsOptions {
  return {
    origin: (origin, callback) => {
      // Requests without an Origin header (curl, health checks) aren't cross-origin.
      callback(null, origin === undefined || allowedOrigins.includes(origin));
    },
    credentials: true,
  };
}
