import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";

// Type only: the web app never imports runtime code from the server (enforced in .oxlintrc.json).
import type { AppRouter } from "@bardery/server/router";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

/** The api's address, set when the web app is built. Only the dev server falls back to the local server. */
function resolveApiUrl(): string | undefined {
  return (
    import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3000" : undefined)
  );
}

export function createApiClient() {
  const url = resolveApiUrl();
  if (url === undefined) console.error("VITE_API_URL was not set when this build was made");
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        // A missing address is reported by every call, so the page shows its error state instead of failing to render.
        url: `${url?.replace(/\/+$/, "") ?? ""}/trpc`,
        // Sends the session cookie across origins.
        // `signal: undefined` is how tRPC says "none", but `exactOptionalPropertyTypes` wants null.
        fetch: (input, init) =>
          url === undefined
            ? Promise.reject(new Error("VITE_API_URL was not set when this build was made"))
            : fetch(input, { ...init, signal: init?.signal ?? null, credentials: "include" }),
      }),
    ],
  });
}
