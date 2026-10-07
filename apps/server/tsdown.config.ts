import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/main.ts"],
    // An app, not a library: no type declarations to publish.
    dts: false,
    deps: {
      // The image ships this one file and no node_modules.
      alwaysBundle: [/./],
      // Bundling every dependency is the intent, so the hint that lists them is noise.
      onlyBundle: false,
    },
  },
  {
    // The web app's only view of the server: the router's types in one file, with the server's `~/`
    // imports resolved, so the web app needs to know nothing of the server's source layout.
    entry: { router: "src/routers/index.ts" },
    dts: { emitDtsOnly: true },
    // The first config cleans `dist` already; this one must not delete its output.
    clean: false,
  },
]);
