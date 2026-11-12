import { describe, expect, it } from "vitest";

import type { Email } from "~/providers/email-sender";
import { createSignInService } from "~/services/sign-in";

function service(options: { accounts?: string[]; requests?: number } = {}) {
  const sent: Email[] = [];
  const signIn = createSignInService({
    accounts: {
      findById: async () => undefined,
      existsWithEmail: async (email) => (options.accounts ?? []).includes(email),
    },
    codeRequests: { record: async () => options.requests ?? 1 },
    emailSender: {
      async send(email) {
        sent.push(email);
      },
    },
    signUpAllowlist: ["parent@example.com"],
  });
  return { signIn, sent };
}

describe("the sign-in service", () => {
  it("lets listed emails create an Account, in any case", () => {
    const { signIn } = service();
    expect(signIn.mayCreateAccount("Parent@Example.com")).toBe(true);
    expect(signIn.mayCreateAccount("other@example.com")).toBe(false);
  });

  it("allows five codes per email an hour", async () => {
    expect(await service({ requests: 5 }).signIn.mayRequestCode("a@example.com")).toBe(true);
    expect(await service({ requests: 6 }).signIn.mayRequestCode("a@example.com")).toBe(false);
  });

  it("emails the code to an Account, even one whose email isn't listed", async () => {
    const { signIn, sent } = service({ accounts: ["known@example.com"] });

    await signIn.sendCode("known@example.com", "123456");

    expect(sent).toEqual([
      expect.objectContaining({ to: "known@example.com", subject: "Your Bardery sign-in code" }),
    ]);
    expect(sent[0]?.text).toContain("Your sign-in code is 123456.");
    expect(sent[0]?.text).toContain("5 minutes");
  });

  it("sends nothing to an email with no Account that may not create one", async () => {
    const { signIn, sent } = service();

    await signIn.sendCode("stranger@example.com", "123456");

    expect(sent).toEqual([]);
  });
});
