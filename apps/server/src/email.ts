import { ManagedIdentityCredential } from "@azure/identity";

import type { Config } from "~/config";
import { createAzureEmailSender } from "~/providers/azure-email-sender";
import type { EmailSender } from "~/providers/email-sender";
import { createSmtpEmailSender } from "~/providers/smtp-email-sender";

/** Azure Communication Services when the config names an endpoint, otherwise the SMTP server (Mailpit). */
export function createEmailSender(config: Config): EmailSender {
  if (config.AZURE_COMMUNICATION_ENDPOINT === undefined) {
    return createSmtpEmailSender({ url: config.SMTP_URL, from: config.EMAIL_FROM });
  }
  return createAzureEmailSender({
    endpoint: config.AZURE_COMMUNICATION_ENDPOINT,
    from: config.EMAIL_FROM,
    credential: new ManagedIdentityCredential(
      config.AZURE_CLIENT_ID === undefined ? undefined : { clientId: config.AZURE_CLIENT_ID },
    ),
  });
}
