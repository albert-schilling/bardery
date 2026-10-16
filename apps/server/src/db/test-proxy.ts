import { connect, createServer, type Socket } from "node:net";
import type { AddressInfo } from "node:net";

export interface TestProxy {
  /** The database URL, pointed at the proxy instead of the server. */
  url: string;
  /** Stops passing data on, keeping connections open: a database that stops answering. */
  pause(): void;
  resume(): void;
  /** Drops every connection and refuses new ones: a database that is gone. */
  close(): Promise<void>;
}

/** A TCP proxy in front of a test database, to break the connection without stopping Postgres. */
export async function startTestProxy(databaseUrl: string): Promise<TestProxy> {
  const target = new URL(databaseUrl);
  const sockets = new Set<Socket>();
  let paused = false;

  const server = createServer((client) => {
    const upstream = connect(Number(target.port), target.hostname);
    for (const socket of [client, upstream]) {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
      // Either side failing ends the pair; the test sees the outcome through the database client.
      socket.on("error", () => {
        client.destroy();
        upstream.destroy();
      });
    }
    client.pipe(upstream);
    upstream.pipe(client);
    if (paused) for (const socket of [client, upstream]) socket.pause();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  const url = new URL(databaseUrl);
  url.hostname = "127.0.0.1";
  url.port = String((server.address() as AddressInfo).port);
  return {
    url: url.toString(),
    pause() {
      paused = true;
      for (const socket of sockets) socket.pause();
    },
    resume() {
      paused = false;
      for (const socket of sockets) socket.resume();
    },
    close() {
      for (const socket of sockets) socket.destroy();
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
