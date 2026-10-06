import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";

// Type only: the web app never imports runtime code from the server (enforced in .oxlintrc.json).
import type { AppRouter } from "@bardery/server/router";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

/** The api's address, set when the web app is built. Only the dev server falls back to the local server. */
function resolveApiUrl(): string {
  const url =
    import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : undefined);
  if (url === undefined) throw new Error("VITE_API_URL was not set when this build was made");
  return url;
}

export function createApiClient(url: string = resolveApiUrl()) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${url}/trpc`,
        // Sends the session cookie across origins.
        // tRPC's init type allows `signal: undefined`, which `exactOptionalPropertyTypes` rejects.
        fetch: (input, init) => fetch(input, { ...init, credentials: "include" } as RequestInit),
      }),
    ],
  });
}
