import type { EmailClient } from "@azure/communication-email";

import type { EmailSender } from "~/providers/email-sender";

export interface AzureEmailSenderOptions {
  client: Pick<EmailClient, "beginSend">;
  /** An address on a domain linked to the client's Communication Service. */
  from: string;
  /** How long to wait for Azure to hand the mail over before giving up. */
  timeoutMs?: number;
}

/**
 * Sends through Azure Communication Services; resolves once Azure reports the send as succeeded, which
 * means it took the mail and handed it on for delivery, not that the mail reached an inbox. What happened
 * after that is in the delivery-status logs (infra/README.md, Staging email).
 */
export function createAzureEmailSender({
  client,
  from,
  timeoutMs = 60_000,
}: AzureEmailSenderOptions): EmailSender {
  return {
    async send({ to, subject, text }) {
      // One deadline for the request and the polling: a hung token request or a send that never
      // leaves `Running` becomes an error, not a command that waits forever.
      const abortSignal = AbortSignal.timeout(timeoutMs);
      const poller = await client.beginSend(
        {
          senderAddress: from,
          recipients: { to: [{ address: to }] },
          content: { subject, plainText: text },
        },
        { abortSignal },
      );
      const result = await poller.pollUntilDone({ abortSignal });
      if (result.status !== "Succeeded") {
        throw new Error(
          `Azure did not send the email: ${result.status} ${result.error?.message ?? ""}`.trim(),
        );
      }
    },
  };
}
