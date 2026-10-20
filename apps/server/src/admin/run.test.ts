import { describe, expect, it, vi } from "vitest";

import { runAdmin, UsageError } from "~/admin/run";
import type { Email } from "~/providers/email-sender";

function setup() {
  const sent: Email[] = [];
  const log = vi.fn();
  return {
    sent,
    log,
    context: { emailSender: { send: async (email: Email) => void sent.push(email) }, log },
  };
}

describe("admin email send-test", () => {
  it("sends a test email to the address", async () => {
    const { sent, log, context } = setup();
    await runAdmin(["email", "send-test", "me@example.com"], context);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("me@example.com");
    expect(log).toHaveBeenCalledWith("Test email accepted for me@example.com");
  });

  it.each([
    [[]],
    [["email"]],
    [["email", "send-test"]],
    [["email", "send-test", "a@b.c", "d"]],
    [["cost"]],
  ])("rejects %j without sending", async (args) => {
    const { sent, context } = setup();
    await expect(runAdmin(args, context)).rejects.toThrow(UsageError);
    expect(sent).toEqual([]);
  });
});
