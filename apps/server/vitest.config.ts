import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    // Resolves the `~/` alias from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    name: "server",
    environment: "node",
    // Starts one Postgres for the whole run, which the integration tests share.
    globalSetup: ["src/db/test-database.global.ts"],
  },
});
