// Applies the checked-in migrations and exits. The migrations job runs this before each deploy.
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { ConfigError, loadConfig } from "~/config";
import { connectDatabase } from "~/db/client";

// Beside this file in the source, and beside the bundle in the image (apps/server/Dockerfile).
const migrationsFolder = fileURLToPath(new URL("db/migrations", import.meta.url));

try {
  const config = loadConfig(process.env);
  const database = connectDatabase({
    url: config.DATABASE_URL,
    azureClientId: config.AZURE_CLIENT_ID,
  });
  try {
    await migrate(database.db, { migrationsFolder });
    console.log("migrations applied");
  } finally {
    await database.close();
  }
} catch (error) {
  console.error(error instanceof ConfigError ? error.message : error);
  process.exitCode = 1;
}
