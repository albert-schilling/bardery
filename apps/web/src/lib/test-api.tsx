import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { ReactNode } from "react";

import type { AppRouter } from "@bardery/server/router";

import { TRPCProvider } from "~/lib/trpc";

/** Wraps a component in the tRPC providers, with a client whose procedures answer from `answers`. */
export function withMockApi(answers: { health: () => unknown }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // A real client over a fake network: every call answers from `answers` as the server would.
  const client = createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: "http://api.test/trpc",
        fetch: async (input) => {
          const path = new URL(input instanceof Request ? input.url : input).pathname.replace(
            "/trpc/",
            "",
          ) as "health";
          try {
            return Response.json({ result: { data: await answers[path]() } });
          } catch {
            return Response.json(
              { error: { message: "failed", code: -32603, data: {} } },
              { status: 500 },
            );
          }
        },
      }),
    ],
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TRPCProvider trpcClient={client} queryClient={queryClient}>
          {children}
        </TRPCProvider>
      </QueryClientProvider>
    );
  };
}
