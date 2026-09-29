# PRD: Walking skeleton

The first deliverable of Bardery (Q91): the thinnest slice of the product that runs through every layer, from the web app to GPT-6 Sol, and is deployed to staging by CI. It's built as a series of small issues, one pull request each, so that every PR can be reviewed line by line and every PR improves the AI harness.

This document says **what** the skeleton contains and in which order it's built. The **how** is already decided; link to it instead of repeating it:

- [`CONTEXT.md`](../../CONTEXT.md): the glossary. Use its terms in code, issues and PRs.
- [Session 2 record](../grilling/2026-09-24-technical-session.md): Q34–Q93, the technical design.
- [`docs/adr/`](../adr/): ADRs 0001–0005.
- [`infra/README.md`](../../infra/README.md): Terraform layout and the one-time setup already done.

## Goal

A person with an invite code opens `https://staging.bardery.app`, signs in with an email one-time code, creates a Profile, starts a Story, and watches its first Part stream in from GPT-6 Sol. After a reload the Part is still there.

Everything on the way is production-shaped, just thin: layered server code (Q46), typed end-to-end API (ADR 0003), Terraform for every Azure resource (Q41), deployment by GitHub Actions only (Q73), and tests for every slice (Q50).

## In scope

- `apps/web`, `apps/server` and `packages/shared/schemas` in a pnpm + Nx workspace (Q48).
- The **staging** environment only, on Azure in `swedencentral` (ADR 0004, Q38).
- Sign-in with an email one-time code through Better Auth, sent by Azure Communication Services from `mail.bardery.app` (Q40, Q93). Invite codes, created with the admin CLI (Q76).
- Creating one Profile: name and birth date.
- Starting a Story for a Profile with no input from the reader. GPT-6 Sol writes the first Part with its title, text, mood colour and three Options, as structured output (Q56). The text streams to the browser over a tRPC subscription (Q37).
- Showing the saved Part, its title and its three Options after a reload.
- Azure's content filters at the strictest threshold on the GPT-6 Sol deployment (Q57).
- Local development with Docker Compose and a deterministic fake text generator (Q60).

## Out of scope

Each of these comes after the skeleton, as its own issues.

- The native app, the prod environment, and preview environments.
- Picking an Option or writing free text, and therefore the free-text classifier (Q57), Storyline branching, Endings and the Decisions screen.
- Illustrations, narration, embeddings and search, and the background job queue (Q92).
- Heroes, Age Band policy in prompts beyond a placeholder, and the House Style.
- The daily limit and cost tracking (Q58), the Parent PIN, Parent settings and deletion (Q62).
- UI translations (Q84), observability (Q52), evals (Q51), Changesets (Q49), Renovate, Nx Cloud.
- The visual design. Screens are plain and unstyled beyond tokens; the Figma design comes later.

## Definition of done

- The goal scenario works on staging, and nothing was set up by hand except what `infra/README.md` documents.
- A merge to `main` checks, builds and deploys both apps to staging, runs the database migrations, and runs a smoke test.
- CI runs the gates that exist so far: format, lint, type check, tests, build, `terraform fmt`/`validate`, and a plan on pull requests.
- `README.md` has a quickstart that gets a new developer from clone to the goal scenario locally.
- The first streamed token arrives within 2 s and is measured, but not yet gated (Q43).

## Slices

One issue per slice, merged in this order. Each slice leaves `main` working and, from slice 4 on, deployed. If an issue turns out bigger than about 300 changed lines, not counting lock files, split it.

| # | Slice | Done when |
|---|---|---|
| 1 | **Workspace**: pnpm workspaces, Nx, oxfmt, oxlint, `tsconfig.base.json`, `AGENTS.md` (with `CLAUDE.md` linking to it). | `pnpm nx run-many -t lint` passes on an empty workspace. |
| 2 | **Web app**: `apps/web` with React Router in SPA mode, Sass and one BEM component; Vitest with Testing Library. | `pnpm nx dev web` shows "Hello, Bardery"; one component test passes. |
| 3 | **Web hosting**: Terraform for `envs/staging` with Static Web Apps and `staging.bardery.app`. | A manual `terraform apply` and a local deploy show the page on `https://staging.bardery.app`. |
| 4 | **CI and CD for the web app**: GitHub Actions with OIDC federation to Entra ID, the checks from slice 1–3, and deploying the web app on merge. | A merged PR changes the page on staging with no manual step. |
| 5 | **Server**: `apps/server` with Express 5 and a `/health` route, the Q46 folder layout and its import rules, a Dockerfile. | The container answers `/health` locally; the layer rules fail on a wrong import. |
| 6 | **Server hosting**: Container Apps environment and `api` app, `api.staging.bardery.app`, image pushed to GHCR by CI. | `https://api.staging.bardery.app/health` answers after a merge. |
| 7 | **tRPC end to end**: `packages/shared/schemas`, a `health` procedure, the tRPC client in the web app, CORS for the staging origin. | The staging page shows the server's health answer. |
| 8 | **Database**: Docker Compose with Postgres and pgvector, Drizzle, the first migration, Postgres Flexible Server in Terraform, and a migrations job run by CI before the deploy. | The `health` procedure reports the database as reachable, locally and on staging. |
| 9 | **Email sending**: Azure Communication Services with `mail.bardery.app` and its DNS records in Terraform; Mailpit locally. | An email sent from the staging server passes SPF, DKIM and DMARC at Posteo. |
| 10 | **Sign-in**: Better Auth with email one-time codes, session cookies scoped to `bardery.app` (Q89), a sign-in screen, and an authenticated tRPC procedure. | A known Account can sign in and out on staging. |
| 11 | **Invites**: single-use invite codes required to create an Account, and `pnpm admin invite create`. | A new Account can only be created with a fresh code from the CLI. |
| 12 | **Profiles**: create and list Profiles for the signed-in Account. | A Profile survives a reload and is invisible to other Accounts. |
| 13 | **Streaming with a fake**: starting a Story streams the first Part from the fake text generator over a tRPC subscription, and saves the Part when complete (Q56). | On staging, text appears word by word and survives a reload; a disconnect mid-stream still saves the Part. |
| 14 | **AI resource**: Foundry resource, GPT-6 Sol deployment in the EU Data Zone, and the content filter policy, in Terraform; the endpoint reaches the server through Key Vault and managed identity. | A smoke test on staging gets a completion from GPT-6 Sol. |
| 15 | **Real generation**: the Azure adapter for `TextGenerator` with structured output (title, text, mood colour, three Options) and a first versioned prompt. | The goal scenario works on staging; the time to first token is logged. |

Slice 13 is also the streaming spike from the session 2 record: it checks the Container Apps ingress timeout and keep-alives. Slice 15 checks whether Azure's streaming content filter holds text back.

## Issues

Every issue is written so that a coding agent can do it without further briefing, and a reviewer can judge the result without the conversation that produced it. Each has:

- **Goal**: one or two sentences.
- **Context**: links to the Q numbers, ADRs and earlier slices it builds on.
- **Acceptance criteria**: checkable statements, including the tests to add.
- **Out of scope**: what the agent must not do, even if it seems helpful.
- **How to verify**: the commands or steps a reviewer runs.

## Harness log

After each merged PR, add one line to [`docs/harness-log.md`](../harness-log.md): what the agent got wrong or needed to be told, and what changed in the harness so it won't happen again, such as a line in `AGENTS.md`, a lint rule, a test or a skill. Prefer a check over a sentence, because agents follow checks reliably.
