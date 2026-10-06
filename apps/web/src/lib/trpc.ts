import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";

// Type only: the web app never imports runtime code from the server (enforced in .oxlintrc.json).
import type { AppRouter } from "@bardery/server/router";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

/** The api's address, set when the web app is built; the local server by default. */
export const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function createApiClient(url: string = apiUrl) {
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
