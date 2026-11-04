# Code and config

- Nx projects keep their config in `project.json` and their source in `src/`.
- Apps import across folders through an absolute alias (`~/` for `src/`, set in `tsconfig.json` and the Vite config); oxlint's `import/no-relative-parent-imports` fails `../` imports under `apps/`.
- Config files stay close to tool defaults; each deviation gets a one-line comment saying why.
- Code and config comments say the reason in words and never cite a grilling question number (Q38); a reader without the session does not know what to do with it. If a comment needs a source, name the document.
