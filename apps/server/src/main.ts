import { ConfigError, loadConfig } from "~/config";
import { startServer } from "~/server";

try {
  const config = loadConfig(process.env);
  const server = await startServer(config);
  console.log(`api ${config.VERSION} listening on port ${server.port}`);

  // Container platforms send SIGTERM before they stop the container; Ctrl+C sends SIGINT.
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      console.log(`${signal} received, shutting down`);
      void server.stop().then(() => console.log("stopped"));
    });
  }
} catch (error) {
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
}
