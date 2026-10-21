import { afterEach, beforeEach, expect, it } from "vitest";

import { connectDatabase, type DatabaseConnection } from "~/db/client";
import { createTestDatabase, migrateTestDatabase, type TestDatabase } from "~/db/test-database";
import { createSignInCodeRequestRepository } from "~/repositories/sign-in-code-requests";

let testDatabase: TestDatabase;
let database: DatabaseConnection;

beforeEach(async () => {
  testDatabase = await createTestDatabase();
  await migrateTestDatabase(testDatabase.url);
  database = connectDatabase({ url: testDatabase.url });
});

afterEach(async () => {
  await database.close();
  await testDatabase.drop();
});

it("counts the requests per email within the window, and starts again after it", async () => {
  const requests = createSignInCodeRequestRepository(database.db);

  expect(await requests.record("a@example.com", 1)).toBe(1);
  expect(await requests.record("a@example.com", 1)).toBe(2);
  expect(await requests.record("b@example.com", 1)).toBe(1);
  await new Promise((resolve) => setTimeout(resolve, 1100));

  expect(await requests.record("a@example.com", 1)).toBe(1);
});

it("counts concurrent requests one by one", async () => {
  const requests = createSignInCodeRequestRepository(database.db);

  const counts = await Promise.all(
    Array.from({ length: 5 }, () => requests.record("a@example.com", 60)),
  );

  expect(counts.toSorted((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
});
