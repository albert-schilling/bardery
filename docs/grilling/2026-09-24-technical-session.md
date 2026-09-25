# Grilling session 2 — technical design (2026-09-24)

Record of the second `/grill-with-docs` session. It closed session 1's open product questions (Q31–Q33) and settled the technical design (Q34–Q89; Q79–Q89 were added on 2026-09-25 and replace the single Expo codebase for native and web). The design tree has no open branches; the next step is implementation, starting with the spikes below.

Where to find what:

- [`CONTEXT.md`](../../CONTEXT.md): the glossary. Updated this session: the Age Bands are listed, 16+ is capped at young-adult content, and a Hero's look follows the Story's Age Band.
- [`docs/adr/`](../adr/):
  - 0001 *Story text is the source of truth*, amended with one portrait per Age Band and the reference-image selection rule.
  - 0002 *Postgres is the only stateful backend*.
  - 0003 *tRPC instead of REST with OpenAPI*.
  - 0004 *Azure for hosting and all AI models*.
  - 0005 *Separate web and native clients*.
- [`docs/research/2026-09-24-azure-all-in.md`](../research/2026-09-24-azure-all-in.md): facts behind ADR 0004 (regions, model limits, prices, terms). It's a snapshot, so check the sources before relying on a number.
- [Session 1](2026-09-23-product-session.md): product decisions Q1–Q30.

Answers below are final. Where an answer was revised during the session, only the final one is listed, with the question it replaced.

## Product (from session 1)

- **Q31 Age Bands**: 0–2, 3–5, 6–8, 9–12, 13–15, 16+. Words per Part and target, minimum and maximum Parts per Story (see session 1's table) are configuration. Bardery never writes adult content; 16+ is capped at young adult.
- **Q32 Hero across Age Bands**: one portrait per Hero per Age Band, generated from the previous band's portrait the first time the Hero appears in a new band (ADR 0001).
- **Q33 Story card colours**: the gradient comes from the mood colours of the default Storyline's Parts.
- **Q54 Reference images (replaces Q17's "all earlier illustrations")**: the Hero portraits always go in; the remaining slots hold the first illustration, the most recent one, and illustrations evenly spaced between them. The maximum is per model and set in configuration: 8 for FLUX.2 [pro]. No collage.
- **Q55 Portuguese**: European Portuguese (pt-PT). pt-BR can be added later as its own Story Language.
- **Q72 Languages at launch (replaces Q18/Q24's list of 11)**: **9 Story Languages**: en, de, fr, es, it, pt-PT, nl, pl, ru. Turkish and Ukrainian are deferred until each has three good Narrator voices. They come back through configuration plus the language quality check.

## Showcase and quality

- **Q34 Audience and licence**: aimed at both hiring managers skimming the repo and engineers reading it in depth. The repo is public from the start, licensed **AGPL-3.0**. There's a hosted demo behind invite codes.
- **Q43 Quality goals, in priority order**:
  1. Child safety.
  2. Story quality and consistency.
  3. Responsiveness: first streamed token < 2 s at p95; illustration < 20 s at p95; first audio < 3 s at p95 on first play (Q59).
  4. Privacy: GDPR, EU-only processing.
  5. Cost control.
  6. Maintainability.

  Accessibility is deferred, but three basics stay as coding standards: labels on icon buttons, system font scaling left on, and design-token contrast checked.
- **Q78 Documentation**:
  - `README.md`: pitch, screenshots, architecture diagram, quickstart, quality gates, how to request a demo invite.
  - `docs/architecture/`: arc42-lite, with C4 diagrams in Mermaid, a runtime view of "generate a Part", quality scenarios, risks, and the list of ADRs.
  - `CONTRIBUTING.md`.
  - `AGENTS.md` as the single source for coding agents, with `CLAUDE.md` symlinked to it. It stays short and points to the docs.

## Client

- **Q79 Two clients (replaces session 1's Q7, one codebase for native and web)**: a React Router web app and an Expo app for iOS and Android, with **feature parity, built web first** (ADR 0005).
- **Q35 Native**: Expo + TypeScript (strict) for iOS and Android. Expo Router, **plain React Native styles** (no styling library), TanStack Query, Zod. EAS Build, Submit and Update.
- **Q80 Web**: React Router v7 in **framework mode as a single-page app** (`ssr: false`, Vite). The build is static, and SSE uses the browser's native `EventSource`.
- **Q81/Q86 Web styling**: **Sass, no Tailwind**.
  - One `.scss` file per component, co-located, holding one **BEM** block with global class names (no CSS Modules).
  - Tokens are CSS custom properties in `styles/_tokens.scss`, so mood colours can change at runtime; Sass supplies mixins and breakpoints.
  - The `@use`/`@forward` module system, compiled with `sass-embedded`.
  - Stylelint (`stylelint-config-standard-scss` plus a BEM `selector-class-pattern`).
  - Modifiers go through a `bem()` helper.
- **Q82 Design tokens**: the Figma design is the single source. Each app keeps its own copy (React Native style constants on native, `_tokens.scss` on the web), with no shared token package. The Figma Make export is a visual reference only; every component is rebuilt.
- **Q83/Q87 Shared packages**: both apps differ only in components, navigation and platform services (see the Q48 layout).
- **Q84/Q88 UI translations**: **i18next**.
  - Resources are JSON per language and namespace (`common`, `story`, `parent`, `email`) in `@bardery/i18n`, with typed keys.
  - The server uses them for emails.
  - Detection uses the device or browser language, falling back to English; Parent settings can override it.
  - **i18next-cli** (official, from the i18next maintainers) checks for missing keys in CI.
- **Q70 Component tests**: Vitest everywhere, no Jest. On the web, Testing Library in jsdom. On native, the **community React Native plugin for Vitest**. Logic stays out of components, in hooks and pure functions, so most tests don't render anything.

## Backend

- **Q36**: TypeScript on Node LTS. A monolith with two process types, `api` and `worker`, from one codebase.
- **Q46 Layers (cut by layer, not by module)**: `apps/server/src/` holds:
  - `routers/`: tRPC; validate with Zod, check auth, call a service.
  - `services/`: orchestration and transactions.
  - `repositories/`: Drizzle queries only.
  - `providers/`: the interfaces `TextGenerator`, `Illustrator`, `Narrator`, `Embedder` and `Moderator`, plus their Azure adapters.
  - `domain/`: pure functions for the Storyline tree, Age Band policy, Ending rules and the daily limit.
  - `jobs/`: worker handlers.
  - `prompts/`: versioned prompt templates.
  - `db/`: schema and migrations.

  Imports only go one way: routers → services → repositories, providers and domain; `domain/` imports nothing; `jobs/` → services. oxlint's `no-restricted-imports` with per-folder overrides enforces this.
- **Data access**: Drizzle. Migrations are generated by drizzle-kit, checked in, and run by a one-off job before each deploy.
- **Q37/Q47 API**: tRPC v11 (ADR 0003) hosted in **Express 5** (Q67). Parts stream as tRPC subscriptions over SSE.
- **Q39**: one Postgres with pgvector and the job queue (pg-boss or Graphile Worker; not decided yet) (ADR 0002).
- **Q40/Q45 Sign-in**: **email one-time code** only in v1, via **Better Auth**, with auth data in our own Postgres. Passkeys can come later as a plugin. Invites are single-use codes. The Parent PIN has 4–6 digits, is hashed with argon2id and rate-limited, and unlocks a short-lived elevated session. Profiles are rows under the Account, not logins.

## Generation pipeline

- **Q56 Generating a Part**:
  1. The input is checked.
  2. The text streams to the client.
  3. On completion, the Part (text, Options, mood colour, and the title if it's the first Part) is committed in one transaction, together with the illustrate and embed jobs.
  4. The illustration arrives later through the same subscription.

  Failures:
  - Text fails mid-stream: nothing is committed and nothing counts toward the daily limit. The child sees a gentle retry.
  - Illustration fails: 3 retries with backoff, then a House Style placeholder, with a background retry later. Missing illustrations are skipped as references.
  - Embedding fails: retried quietly.
  - The client disconnects: generation still finishes and commits. The subscription can be resumed by Part ID.
- **Q57 Safety**:
  - Azure's built-in content filters run on every model call, set to the strictest threshold ("low").
  - One explicit LLM classifier call checks free text: *fine / reinterpret gently / block*. This one step replaces the separate moderation and classification steps first proposed.
  - Each Age Band has its own content policy in the system prompt.
  - Azure's streaming filter checks output chunks before they're released. **To verify in the streaming spike.**
  - Blocks and reinterpretations are logged as metadata only.
- **Q58 Daily limit and cost**:
  - The limit resets at midnight in the **Account timezone**, set from the device at sign-up and editable in Parent settings.
  - It's checked before generation and counted on commit.
  - Cost is recorded per generation (model, units, unit price at the time), rolled up per Account and day in Postgres, and exported as a metric. Only the admin sees it.
- **Q59 Narration**: synthesized paragraph by paragraph. The first chunk plays while the rest are generated, and each chunk is saved, so later replays are instant.
- **Q62 Deleting an Account**: a job that:
  1. cascades the database rows;
  2. deletes the Account's storage prefix `accounts/{id}/`;
  3. emails the parent a confirmation.

  Backups age out within 7 days. Deleting a Profile works the same way, scoped to that Profile. An integration test asserts nothing remains after a deletion.

## AI providers (ADR 0004)

- **Q53/Q66**: Azure for everything, in the EU Data Zone, region `swedencentral`. No model comparison and no second cloud.

  | Modality | Model or service |
  |---|---|
  | Story text | GPT-6 Sol, with structured outputs |
  | Illustrations | **FLUX.2 [pro]** (Q68), at most 8 references, no access application needed |
  | Narration | Azure Speech |
  | Embeddings | text-embedding-3-small |

- **Obligations**:
  - The terms of use must bind end users to terms that protect BFL at least as well as BFL's own terms (a FLUX requirement).
  - The privacy notice must disclose Azure's abuse monitoring.
- `gpt-image-1.5` or `gpt-image-2` can be added later as an adapter if FLUX isn't consistent enough.

## Infrastructure and delivery

- **Q38/Q44/Q71 Azure layout**:
  - Resource groups `bardery-staging`, `bardery-prod` and `bardery-shared`.
  - A Container Apps environment (consumption plan) per environment:
    - `api`: min 1 replica in prod, 0 in staging.
    - `worker`: min 0, woken by KEDA's `postgresql` scaler on queue depth.
    - Migrations run as a Container Apps Job.
  - Postgres Flexible Server B1ms with pgvector and 7-day backups, one per environment.
  - Key Vault + managed identities.
  - GitHub Container Registry (GHCR) for images.
  - Email via Azure Communication Services.
  - No Kubernetes. Costs stay low; scaling is configuration.
- **Q69 Delivery**: media is served from private Blob Storage via short-lived signed URLs (SAS) issued by the API. `apps/web` is hosted on Azure Static Web Apps. No Front Door for now; its base fee is $35/month.
- **Q85/Q89 Domain and DNS**:
  - One custom domain, bought at united-domains, with its nameservers delegated to **Azure DNS**, so every record is Terraform code. The delegation is a one-time manual step documented in the infrastructure README.
  - Subdomains: `app.` and `api.` for prod; `staging.` and `api.staging.` for staging.
  - Same-site session cookies (`SameSite=Lax`, `Secure`, scoped to the parent domain).
- **Q41 IaC**: **Terraform** (`azurerm`) with state in Azure Storage. GitHub Actions authenticates via OIDC federation to Entra ID. Environments `staging` and `prod`.
- **Q42 Workflow**: GitHub + GitHub Actions, trunk-based with short-lived pull requests, squash-merged with a descriptive title. Renovate handles dependency updates.
- **Q49 Changelog**: **Changesets** versions only `apps/web`, `apps/mobile` and `apps/server`; every `packages/*` is private. A pull request needs a changeset unless it carries the `no-changeset` label. EAS auto-increments store build numbers.
- **Q73 Environments and releases**:
  - Environments: local, staging, prod. No preview environments per pull request in v1.
  - Merging to `main` builds the server image and the web bundle once, deploys both to staging, runs migrations and a smoke test.
  - Prod promotes the same image and bundle after manual approval.
  - EAS build profiles `preview` and `production`; over-the-air update channels `staging` and `production`.
- **Q74 CI gates**, run on Nx-affected projects:
  - Code: oxfmt check, oxlint (type-aware, with module boundaries and layer rules), Stylelint, `tsc`, Vitest, build.
  - Translations: i18next-cli finds no missing keys.
  - Database: Drizzle migration check.
  - Infrastructure: `terraform fmt`/`validate`, tflint, and a `plan` comment on the pull request.
  - Security: GitHub secret scanning with push protection, CodeQL, Dependabot alerts, and Trivy scanning images and Terraform.
  - Supply chain: Actions pinned to commit SHAs; images signed with build provenance.
  - The changeset check.
- **Q75 Local git hooks**: lefthook runs oxfmt, oxlint and Stylelint on staged files only.

## Repo and tooling

- **Q48 Layout**:
  ```
  apps/web                  React Router app
  apps/mobile               Expo app (iOS, Android)
  apps/server               api + worker, layered as in Q46, plus the admin CLI
  packages/shared/schemas   @bardery/schemas: Zod schemas and domain types for server and clients
  packages/shared/client    @bardery/client: tRPC client, query hooks, view-model hooks, platform-service interfaces
  packages/shared/i18n      @bardery/i18n: i18next resources and typed keys
  packages/shared/utils     @bardery/utils: pure, framework-free, domain-free helpers only
  packages/evals            AI eval datasets, scorers and harness
  infra/             Terraform (modules/, envs/staging, envs/prod)
  docs/              adr/, architecture/, research/, grilling/, design/
  ```
  Nx tags enforce the allowed dependencies:
  - `utils` and `i18n` depend on nothing;
  - `schemas` → `utils`;
  - `client` → `schemas`, `utils`, `i18n`;
  - the server may use `schemas`, `utils` and `i18n`, never `client`.
- **Tooling**: pnpm workspaces + **Nx** with the free Nx Cloud tier for remote caching. Configuration lives at the repo root: `.oxlintrc.json`, oxfmt config, Stylelint config, `tsconfig.base.json`, and `vitest.config.ts` with `test.projects`. There's no `packages/config`.
- **Q63**: no `@nx/expo`. `apps/mobile` is a plain Nx project that calls the Expo CLI and EAS directly.
- **Tooling gotchas found in research** (versions as of 2026-09-24):
  - oxlint runs Nx's module-boundaries rule through the experimental `@nx/oxlint` bridge.
  - Nested oxlint configs replace their parent rather than merge, so a nested config must `extends` it.
  - oxfmt is still beta. Whether it formats SCSS is unverified; check this when setting up the repo.
  - Expo officially documents only Jest; Vitest with React Native relies on a community plugin.
  - Express has automatic OpenTelemetry instrumentation.

## Testing and evals

- **Q50 Testing**:
  - Unit tests (Vitest) for domain functions and for services with fake repositories and providers; TDD where the logic isn't trivial.
  - Integration tests (Vitest + Testcontainers Postgres with pgvector) for repositories, migrations, the queue, and tRPC procedures via `createCaller`.
  - Component tests (see Q70).
  - Coverage is reported per module, with no global gate. Mutation testing (Stryker) runs on `domain/` only.
  - **Deferred**: contract tests for the provider adapters and E2E tests (Playwright on web, Maestro on native).
- **Q51/Q64 Evals**: a **custom harness on Vitest** in `packages/evals`:
  - Datasets: synthetic only, as JSON. Story scenarios per Age Band × language, a red-team set for Q19, multi-Part Storylines, Hero carry-over cases.
  - Scorers: deterministic checks plus an LLM judge with written rubrics. The judge is calibrated against a small human-labelled set.
  - Image checks: depicts only what the text states, character consistency, House Style.
  - Results go to JSON and are compared against a checked-in baseline, producing a Markdown report.
  - Prompts are versioned files, and each Part records its prompt version and model ID.
  - Evalite was rejected (0.x, stalled); promptfoo was rejected (being acquired by OpenAI).
- **Q61 When evals run**: manually, when the developer judges a change needs it. Nothing runs automatically and there's no CI guard, for now.
- **Q60 Local development**:
  - Docker Compose runs Postgres with pgvector, a local stand-in for Blob Storage (Azurite), and Mailpit for email.
  - AI providers default to deterministic fakes, the same ones the tests use.
  - `AI_PROVIDERS=live` switches to Azure.
  - A seed script creates an Account with a branched Story.

## Operations

- **Q52 Observability**:
  - OpenTelemetry everywhere, including GenAI spans (model, tokens, latency, cost, prompt version).
  - **No story or prompt content in telemetry**; a span processor drops every attribute not on an allowlist.
  - Grafana Cloud's free EU tier, with dashboards and alerts as code.
  - Sentry (EU) for errors on server, native and web (React SDK), with personal data scrubbed.
  - SLO burn-rate alerts; cost per Part as a metric with a budget alert.
  - **Q65**: no EAS Observe in v1, because its data is stored in the US.
- **Q76 Admin**: a CLI in `apps/server` (`pnpm admin invite create`, `pnpm admin cost …`) run with Entra credentials. No admin UI and no roles.
- **Q77**: no product analytics or trackers. Usage questions are answered with SQL over our own data and shown in Grafana as aggregates.

## First implementation steps

1. **Streaming spike**: tRPC SSE subscription through Express on Azure Container Apps (check the 240 s ingress timeout; send keep-alives) into the web app (native `EventSource`) and Expo on iOS and Android (`EventSource` polyfill). Also check whether Azure's streaming content filter holds output back before release.
2. **Illustration spike**: FLUX.2 [pro] with the Q54 reference selection on a hand-written 8-Part Storyline. Check Hero consistency and House Style, and measure cost per image.
3. **Narration listening test**: 3 Narrators for each of the 9 languages.
4. Scaffold the monorepo, CI gates and Terraform environments. Then build features test-first.

## Carried over from session 1

Prototype corrections still to make:
- Use the final Age Bands in the profile picker.
- Headphones icon instead of the microphone.
- Each entry on the Decisions screen quotes its own Part.
- Choice behaviour in audio mode.
