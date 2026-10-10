import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { expect, it } from "vitest";

import { connectDatabase } from "~/db/client";
import { startTestDatabase } from "~/db/test-database";

it("the migrations enable pgvector", { timeout: 120_000 }, async () => {
  const container = await startTestDatabase();
  const database = connectDatabase({ url: container.getConnectionUri() });
  try {
    await migrate(database.db, {
      migrationsFolder: fileURLToPath(new URL("migrations", import.meta.url)),
    });

    const { rows } = await database.db.execute(
      sql`select extname from pg_extension where extname = 'vector'`,
    );
    expect(rows).toEqual([{ extname: "vector" }]);
  } finally {
    await database.close();
    await container.stop();
  }
});
