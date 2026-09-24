# tRPC instead of REST with OpenAPI

The app and the server talk through tRPC, and streamed Parts arrive as tRPC subscriptions over server-sent events. Both sides are TypeScript in one monorepo, so tRPC gives end-to-end types with no schema file or generated client to keep in sync. We gave up the language-neutral OpenAPI contract that REST would have given us, and with it generated API docs and contract tests usable from other languages.

## Consequences

- The client is tightly coupled to the server's router types. If a non-TypeScript client or a public API appears, add a REST/OpenAPI layer next to tRPC and record it as a new ADR.
- React Native has no built-in `EventSource`, so streaming needs a polyfill. A spike proves streaming on iOS, Android and web before features are built on it.
