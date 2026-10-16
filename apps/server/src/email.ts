import { EmailClient } from "@azure/communication-email";
import { ManagedIdentityCredential } from "@azure/identity";

import type { Config } from "~/config";
import { createAzureEmailSender } from "~/providers/azure-email-sender";
import type { EmailSender } from "~/providers/email-sender";
import { createSmtpEmailSender } from "~/providers/smtp-email-sender";

/**
 * Azure Communication Services when the config names an endpoint, otherwise the SMTP server (Mailpit).
 * A deployed server (the image sets NODE_ENV=production) must name an endpoint: without it, a lost
 * variable would send to localhost and fail far from the cause.
 */
export function createEmailSender(config: Config): EmailSender {
  if (config.AZURE_COMMUNICATION_ENDPOINT === undefined) {
    if (config.NODE_ENV === "production") {
      throw new Error(
        "AZURE_COMMUNICATION_ENDPOINT is not set; a deployed server must send through Azure.",
      );
    }
    return createSmtpEmailSender({ url: config.SMTP_URL, from: config.EMAIL_FROM });
  }
  const credential = new ManagedIdentityCredential(
    config.AZURE_CLIENT_ID === undefined ? undefined : { clientId: config.AZURE_CLIENT_ID },
  );
  return createAzureEmailSender({
    client: new EmailClient(config.AZURE_COMMUNICATION_ENDPOINT, credential),
    from: config.EMAIL_FROM,
  });
}
