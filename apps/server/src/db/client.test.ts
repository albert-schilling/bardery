import { sql } from "drizzle-orm";
import { expect, it } from "vitest";

import { connectDatabase } from "~/db/client";
import { startTestDatabase } from "~/db/test-database";

// On Azure the URL names no password and an Entra token is the password, fetched per connection.
it(
  "signs in with the password function when the URL has no password",
  { timeout: 120_000 },
  async () => {
    const container = await startTestDatabase();
    const url = new URL(container.getConnectionUri());
    const password = url.password;
    url.password = "";
    const database = connectDatabase({ url: url.toString(), password: async () => password });
    try {
      const { rows } = await database.db.execute(sql`select current_user`);
      expect(rows).toEqual([{ current_user: container.getUsername() }]);
    } finally {
      await database.close();
      await container.stop();
    }
  },
);
