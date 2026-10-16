import { EmailClient } from "@azure/communication-email";
import type { TokenCredential } from "@azure/identity";

import type { EmailSender } from "~/providers/email-sender";

export interface AzureEmailSenderOptions {
  /** The Communication Service's endpoint, for example `https://bardery-staging.europe.communication.azure.com`. */
  endpoint: string;
  /** An address on a domain linked to that Communication Service. */
  from: string;
  credential: TokenCredential;
}

/** Sends through Azure Communication Services; resolves once Azure has delivered the mail to the recipient's server. */
export function createAzureEmailSender({
  endpoint,
  from,
  credential,
}: AzureEmailSenderOptions): EmailSender {
  const client = new EmailClient(endpoint, credential);
  return {
    async send({ to, subject, text }) {
      const poller = await client.beginSend({
        senderAddress: from,
        recipients: { to: [{ address: to }] },
        content: { subject, plainText: text },
      });
      const result = await poller.pollUntilDone();
      if (result.status !== "Succeeded") {
        throw new Error(
          `Azure did not send the email: ${result.status} ${result.error?.message ?? ""}`.trim(),
        );
      }
    },
  };
}
