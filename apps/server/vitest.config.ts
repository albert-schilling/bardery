import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    // Resolves the `~/` alias from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    name: "server",
    environment: "node",
    // One test file at a time: files that start Postgres with Testcontainers would otherwise start
    // their containers together, and Docker then sometimes picks a host port that is already in use.
    fileParallelism: false,
  },
});
