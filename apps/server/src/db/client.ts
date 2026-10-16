import { ManagedIdentityCredential } from "@azure/identity";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { parseIntoClientConfig } from "pg-connection-string";

export type Database = NodePgDatabase;

export interface DatabaseConnection {
  db: Database;
  /** Closes every connection; the process can exit once this resolves. */
  close(): Promise<void>;
}

export interface DatabaseOptions {
  url: string;
  /** Called for each new connection, in place of the URL's password (see `entraToken`). */
  password?: (() => Promise<string>) | undefined;
}

// The token audience of Azure Database for PostgreSQL.
const entraScope = "https://ossrdbms-aad.database.windows.net/.default";

/** Opens a connection pool; it connects on the first query, so an unreachable database fails there. */
export function connectDatabase({ url, password }: DatabaseOptions): DatabaseConnection {
  const pool = new Pool({
    // Parsed here, not passed as `connectionString`: pg would let the URL's empty password replace
    // the `password` function below, and the server would get no password at all.
    ...parseIntoClientConfig(url),
    // A health check should report an unreachable database, not wait for the OS to give up: neither
    // on a new connection nor on a pooled one whose database stopped answering.
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
    ...(password !== undefined && { password }),
  });
  // An idle connection that the database drops emits this; unhandled, it would end the process.
  pool.on("error", (error) => console.error("database connection lost:", error.message));
  return { db: drizzle({ client: pool }), close: () => pool.end() };
}

/** A password for `connectDatabase` that signs in as this managed identity with a fresh Entra token. */
export function entraToken(clientId: string): () => Promise<string> {
  const credential = new ManagedIdentityCredential({ clientId });
  return async () => (await credential.getToken(entraScope)).token;
}
