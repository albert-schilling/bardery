import { ConfigError, loadConfig } from "~/config";
import { startServer } from "~/server";

try {
  const config = loadConfig(process.env);
  const server = await startServer(config);
  console.log(`api ${config.VERSION} listening on port ${server.port}`);

  let stopping = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (stopping) return;
    stopping = true;
    console.log(`${signal} received, shutting down`);
    server.stop().then(
      () => console.log("stopped"),
      (error: unknown) => {
        console.error("shutdown failed:", error);
        process.exitCode = 1;
      },
    );
  };
  // Container platforms send SIGTERM before they stop the container; Ctrl+C sends SIGINT.
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
} catch (error) {
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
}
