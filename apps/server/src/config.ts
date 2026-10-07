import { z } from "zod";

const configSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // Set at image build time, so `/health` says which build is running.
  VERSION: z.string().min(1).default("dev"),
  // Origins of the web apps that may call the api from a browser, comma-separated. The default is
  // the local web dev server only; a deployed api must set its own list, so it never allows localhost.
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

export type Config = z.infer<typeof configSchema>;

export class ConfigError extends Error {
  override name = "ConfigError";
}

/** Reads the configuration from environment variables; throws a `ConfigError` naming each invalid one. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new ConfigError(`Invalid configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
