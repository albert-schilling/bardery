import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { expect, it } from "vitest";

import { connectDatabase } from "~/db/client";
import { createTestDatabase } from "~/db/test-database";

it("the migrations enable pgvector", async () => {
  const testDatabase = await createTestDatabase();
  const database = connectDatabase({ url: testDatabase.url });
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
    await testDatabase.drop();
  }
});
