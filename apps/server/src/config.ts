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
  // The local Docker Compose database by default. On Azure the URL names no password: the server
  // signs in as the managed identity below, with an Entra token.
  DATABASE_URL: z
    .url({ protocol: /^postgres(ql)?$/ })
    .default("postgres://bardery:bardery@localhost:5432/bardery"),
  // The client ID of the managed identity to sign in to the database with; unset locally.
  AZURE_CLIENT_ID: z.string().min(1).optional(),
  // The sender of every email; its domain must be verified on the Communication Service.
  EMAIL_FROM: z.email().default("noreply@mail.bardery.app"),
  // The endpoint of the Azure Communication Service to send through. Unset locally, where the
  // server sends to the SMTP server below instead.
  AZURE_COMMUNICATION_ENDPOINT: z.url({ protocol: /^https$/ }).optional(),
  // Mailpit from docker-compose.yml by default; used only without an Azure endpoint.
  SMTP_URL: z.url({ protocol: /^smtps?$/ }).default("smtp://localhost:1025"),
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
