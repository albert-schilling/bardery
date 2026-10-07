import { ManagedIdentityCredential } from "@azure/identity";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export type Database = NodePgDatabase;

export interface DatabaseConnection {
  db: Database;
  /** Closes every connection; the process can exit once this resolves. */
  close(): Promise<void>;
}

export interface DatabaseOptions {
  url: string;
  /** Signs in with an Entra token for this managed identity instead of the URL's password. */
  azureClientId?: string | undefined;
}

// The token audience of Azure Database for PostgreSQL.
const entraScope = "https://ossrdbms-aad.database.windows.net/.default";

/** Opens a connection pool; it connects on the first query, so an unreachable database fails there. */
export function connectDatabase({ url, azureClientId }: DatabaseOptions): DatabaseConnection {
  const pool = new Pool({
    connectionString: url,
    // A health check should report an unreachable database, not wait for the OS to give up.
    connectionTimeoutMillis: 5000,
    // pg asks for the password on every new connection, so each one gets a fresh token.
    ...(azureClientId !== undefined && { password: entraToken(azureClientId) }),
  });
  // An idle connection that the database drops emits this; unhandled, it would end the process.
  pool.on("error", (error) => console.error("database connection lost:", error.message));
  return { db: drizzle({ client: pool }), close: () => pool.end() };
}

function entraToken(clientId: string): () => Promise<string> {
  const credential = new ManagedIdentityCredential({ clientId });
  return async () => (await credential.getToken(entraScope)).token;
}
