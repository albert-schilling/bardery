import { defineConfig, type UserConfig } from "tsdown";

// One self-contained file per entry: the image ships these files and no node_modules.
const bundle = {
  // An app, not a library: no type declarations to publish.
  dts: false,
  deps: {
    alwaysBundle: [/./],
    // Bundling every dependency is the intent, so the hint that lists them is noise.
    onlyBundle: false,
  },
  // Inlines dynamic imports too (@azure/identity has one) instead of writing them as chunk files.
  outputOptions: { codeSplitting: false },
} satisfies UserConfig;

export default defineConfig([
  { entry: ["src/main.ts"], ...bundle },
  // Its own build, not a second entry above: a build without code splitting takes one entry.
  // The first config cleans `dist` already; the others must not delete its output.
  {
    entry: ["src/migrate.ts"],
    ...bundle,
    clean: false,
    // migrate.mjs reads the migrations from beside it, locally and in the image.
    copy: [{ from: "src/db/migrations", to: "dist/db" }],
  },
  {
    // The web app's only view of the server: the router's types in one file, with the server's `~/`
    // imports resolved, so the web app needs to know nothing of the server's source layout.
    entry: { router: "src/routers/index.ts" },
    dts: { emitDtsOnly: true },
    clean: false,
  },
]);
