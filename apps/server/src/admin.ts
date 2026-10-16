// The admin CLI: `pnpm admin <command>` locally, `node dist/admin.mjs <command>` in the api image
// (on staging through `az containerapp exec`, so it never needs network access to the database).
import { ConfigError, loadConfig } from "~/config";
import { runAdmin, UsageError } from "~/admin/run";
import { createEmailSender } from "~/email";

try {
  const config = loadConfig(process.env);
  await runAdmin(process.argv.slice(2), {
    emailSender: createEmailSender(config),
    log: console.log,
  });
} catch (error) {
  console.error(
    error instanceof ConfigError || error instanceof UsageError ? error.message : error,
  );
  process.exitCode = 1;
}
