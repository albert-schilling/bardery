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

  it("names the operation and its last status when Azure accepts the email but doesn't finish", async () => {
    // Azure answers the send with an operation that stays `Running`; the poll ends only on abort.
    const beginSend = vi.fn(async (_message, options) => {
      options.onResponse({ parsedBody: { id: "op-1", status: "Running" } });
      return {
        pollUntilDone: ({ abortSignal }: { abortSignal: AbortSignal }) =>
          new Promise((_resolve, reject) =>
            abortSignal.addEventListener("abort", () =>
              reject(new Error("The delay was aborted.")),
            ),
          ),
      };
    });
    const sender = createAzureEmailSender({
      client: { beginSend } as never,
      from: "a@b.c",
      timeoutMs: 50,
    });

    await expect(sender.send(email)).rejects.toThrow(
      "Azure accepted the email (operation op-1) but hadn't sent it after 0.05 s; its last status was Running.",
    );
  });

  it("says Azure never accepted the email when the send request itself times out", async () => {
    const beginSend = vi.fn(
      (_message, { abortSignal }: { abortSignal: AbortSignal }) =>
        new Promise((_resolve, reject) =>
          abortSignal.addEventListener("abort", () =>
            reject(new Error("The operation was aborted.")),
          ),
        ),
    );
    const sender = createAzureEmailSender({
      client: { beginSend } as never,
      from: "a@b.c",
      timeoutMs: 50,
    });

    await expect(sender.send(email)).rejects.toThrow(
      "Azure hadn't accepted the email after 0.05 s.",
    );
  });
});
