import type { EmailSender } from "~/providers/email-sender";

export interface AdminContext {
  emailSender: EmailSender;
  log(message: string): void;
}

export const usage = "Usage: admin email send-test <address>";

export class UsageError extends Error {
  override name = "UsageError";
}

/** Runs one admin command; throws a `UsageError` for arguments it does not know. */
export async function runAdmin(args: string[], context: AdminContext): Promise<void> {
  const [group, command, address, ...rest] = args;
  if (group === "email" && command === "send-test" && address !== undefined && rest.length === 0) {
    await context.emailSender.send({
      to: address,
      subject: "Bardery test email",
      text: "This is a test email from Bardery's admin CLI.",
    });
    context.log(`Test email sent to ${address}`);
    return;
  }
  throw new UsageError(usage);
}
