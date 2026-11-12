import type { AccountRepository } from "~/repositories/accounts";
import type { SignInCodeRequestRepository } from "~/repositories/sign-in-code-requests";
import type { EmailSender } from "~/providers/email-sender";

export const signInCodeLifetimeMinutes = 5;

// Each code allows a few attempts, so this also bounds how fast an address's codes can be guessed.
const maxCodesPerHour = 5;

export interface SignInService {
  /** Counts a request for a code to `email`; false once the address has had too many this hour. */
  mayRequestCode(email: string): Promise<boolean>;
  /** Whether a new Account may be created for `email`: until invite codes, only listed emails may. */
  mayCreateAccount(email: string): boolean;
  /** Emails the code, unless the address has no Account and may not create one: then nothing is sent. */
  sendCode(email: string, code: string): Promise<void>;
}

export function createSignInService(deps: {
  accounts: AccountRepository;
  codeRequests: SignInCodeRequestRepository;
  emailSender: EmailSender;
  signUpAllowlist: readonly string[];
}): SignInService {
  const mayCreateAccount = (email: string) => deps.signUpAllowlist.includes(email.toLowerCase());
  return {
    async mayRequestCode(email) {
      return (await deps.codeRequests.record(email.toLowerCase(), 3600)) <= maxCodesPerHour;
    },
    mayCreateAccount,
    async sendCode(email, code) {
      if (!mayCreateAccount(email) && !(await deps.accounts.existsWithEmail(email))) return;
      await deps.emailSender.send({
        to: email,
        subject: "Your Bardery sign-in code",
        text: [
          `Your sign-in code is ${code}.`,
          `It works once, for ${signInCodeLifetimeMinutes} minutes.`,
          "If you didn't ask for it, you can ignore this email.",
        ].join("\n\n"),
      });
    },
  };
}
