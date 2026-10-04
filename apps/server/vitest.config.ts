import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    // Resolves the `~/` alias from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    name: "server",
    environment: "node",
  },
});
