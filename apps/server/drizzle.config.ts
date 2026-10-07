import { defineConfig } from "drizzle-kit";

import { loadConfig } from "./src/config";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  // The server's own setting, so drizzle-kit's commands use the local database by default too.
  dbCredentials: { url: loadConfig(process.env).DATABASE_URL },
});
