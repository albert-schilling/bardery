import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/main.ts"],
  // An app, not a library: no type declarations to publish.
  dts: false,
  deps: {
    // The image ships this one file and no node_modules.
    alwaysBundle: [/./],
    // Bundling every dependency is the intent, so the hint that lists them is noise.
    onlyBundle: false,
  },
});
