import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/main.ts"],
  // An app, not a library: no type declarations to publish.
  dts: false,
});
