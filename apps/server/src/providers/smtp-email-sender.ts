import { createTransport } from "nodemailer";

import type { EmailSender } from "~/providers/email-sender";

export interface SmtpEmailSenderOptions {
  /** For example `smtp://localhost:1025`, where Mailpit listens. */
  url: string;
  from: string;
}

/** Sends through an SMTP server; locally that is Mailpit, which keeps the mail instead of delivering it. */
export function createSmtpEmailSender({ url, from }: SmtpEmailSenderOptions): EmailSender {
  const transport = createTransport(url);
  return {
    async send({ to, subject, text }) {
      await transport.sendMail({ from, to, subject, text });
    },
  };
}
