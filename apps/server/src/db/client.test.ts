import { sql } from "drizzle-orm";
import { expect, it } from "vitest";

import { connectDatabase } from "~/db/client";
import { createTestDatabase } from "~/db/test-database";

// On Azure the URL names no password and an Entra token is the password, fetched per connection.
it("signs in with the password function when the URL has no password", async () => {
  const testDatabase = await createTestDatabase();
  const url = new URL(testDatabase.url);
  const { username, password } = url;
  url.password = "";
  const database = connectDatabase({ url: url.toString(), password: async () => password });
  try {
    const { rows } = await database.db.execute(sql`select current_user`);
    expect(rows).toEqual([{ current_user: username }]);
  } finally {
    await database.close();
    await testDatabase.drop();
  }
});
