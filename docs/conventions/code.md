# Code and config

- Nx projects keep their config in `project.json` and their source in `src/`.
- Apps import across folders through an absolute alias (`~/` for `src/`, set in `tsconfig.json` and the Vite config); oxlint's `import/no-relative-parent-imports` fails `../` imports under `apps/`.
- Config files stay close to tool defaults; each deviation gets a one-line comment saying why.
- Code and config comments say the reason in words and never cite a grilling question number (Q38); a reader without the session does not know what to do with it. If a comment needs a source, name the document.
- A deployed build never falls back to a local address. Local defaults for Vite go in `.env.development`, not `.env`, which Vite also loads for production builds. A build that lacks a required value fails, or shows an error state, instead of calling localhost.
- Values that differ per deployment, such as the api's URL, live in the GitHub environment's variables (`vars.*`), not written into the workflow.
- No type assertions to get past `exactOptionalPropertyTypes`: map `undefined` to the type's own empty value instead (`signal: init?.signal ?? null`).
- Text that changes after the page loads, such as a loading or status line, sits in a live region (`role="status"`), so screen readers announce it. Errors use `role="alert"`.
