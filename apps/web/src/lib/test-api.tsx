import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { ReactNode } from "react";

import type { AppRouter } from "@bardery/server/router";

import { type Auth, AuthProvider } from "~/lib/auth";
import { TRPCProvider } from "~/lib/trpc";

/** An Auth whose calls all succeed; a test replaces the ones it checks. */
export function fakeAuth(overrides: Partial<Auth> = {}): Auth {
  return {
    sendCode: async () => {},
    signIn: async () => {},
    signOut: async () => {},
    ...overrides,
  };
}

/**
 * Wraps a component in the tRPC and auth providers, with a client whose procedures answer from
 * `answers`; an answer that throws `UnauthorizedError` fails as for an anonymous reader.
 */
export function withMockApi(answers: Record<string, () => unknown>, auth: Auth = fakeAuth()) {
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
          );
          const answer = answers[path];
          // A procedure the test didn't provide is a mistake in the test, not a server error.
          if (answer === undefined) {
            return Response.json({ error: `no answer for "${path}"` }, { status: 404 });
          }
          try {
            return Response.json({ result: { data: await answer() } });
          } catch (error) {
            if (error instanceof UnauthorizedError) {
              return Response.json(
                {
                  error: { message: "UNAUTHORIZED", code: -32001, data: { code: "UNAUTHORIZED" } },
                },
                { status: 401 },
              );
            }
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
          <AuthProvider auth={auth}>{children}</AuthProvider>
        </TRPCProvider>
      </QueryClientProvider>
    );
  };
}

/** Thrown by an answer to make the procedure fail as it does for an anonymous reader. */
export class UnauthorizedError extends Error {}
