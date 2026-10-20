export interface Email {
  to: string;
  subject: string;
  /** Plain text; templates and HTML come with the sign-in email. */
  text: string;
}

/** Sends one email from the app's sender address; rejects when the provider does not accept it. */
export interface EmailSender {
  send(email: Email): Promise<void>;
}
