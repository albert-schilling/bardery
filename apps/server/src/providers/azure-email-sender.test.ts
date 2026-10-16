import { describe, expect, it, vi } from "vitest";

import { createAzureEmailSender } from "~/providers/azure-email-sender";

const email = { to: "me@example.com", subject: "Hello", text: "Body" };

// A client whose send finishes with the given result.
function clientWith(result: { status: string; error?: { message: string } }) {
  const pollUntilDone = vi.fn().mockResolvedValue(result);
  const beginSend = vi.fn().mockResolvedValue({ pollUntilDone });
  return { client: { beginSend } as never, beginSend, pollUntilDone };
}

describe("the Azure email sender", () => {
  it("sends from the configured address and resolves once Azure reports success", async () => {
    const { client, beginSend } = clientWith({ status: "Succeeded" });
    await createAzureEmailSender({ client, from: "noreply@mail.bardery.app" }).send(email);
    expect(beginSend.mock.calls[0]?.[0]).toEqual({
      senderAddress: "noreply@mail.bardery.app",
      recipients: { to: [{ address: "me@example.com" }] },
      content: { subject: "Hello", plainText: "Body" },
    });
  });

  it("rejects with Azure's reason when the send did not succeed", async () => {
    const { client } = clientWith({ status: "Failed", error: { message: "Domain not linked" } });
    await expect(createAzureEmailSender({ client, from: "a@b.c" }).send(email)).rejects.toThrow(
      "Azure did not send the email: Failed Domain not linked",
    );
  });

  it("gives the request and the polling a deadline, so a send that never finishes fails", async () => {
    const { client, beginSend, pollUntilDone } = clientWith({ status: "Succeeded" });
    await createAzureEmailSender({ client, from: "a@b.c", timeoutMs: 50 }).send(email);
    const requestSignal: AbortSignal = beginSend.mock.calls[0]?.[1].abortSignal;
    const pollSignal: AbortSignal = pollUntilDone.mock.calls[0]?.[0].abortSignal;
    expect(requestSignal).toBe(pollSignal);
    await vi.waitFor(() => expect(requestSignal.aborted).toBe(true));
  });
});
