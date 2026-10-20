import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadConfig } from "~/config";
import { createEmailSender } from "~/email";
import { createAzureEmailSender } from "~/providers/azure-email-sender";
import { createSmtpEmailSender } from "~/providers/smtp-email-sender";

// The adapters are replaced to see which one gets built; their own tests cover how they send.
vi.mock("~/providers/smtp-email-sender", () => ({ createSmtpEmailSender: vi.fn(() => ({})) }));
vi.mock("~/providers/azure-email-sender", () => ({ createAzureEmailSender: vi.fn(() => ({})) }));

describe("createEmailSender", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends through SMTP locally, from the configured address, without an Azure endpoint", () => {
    createEmailSender(loadConfig({ SMTP_URL: "smtp://mailpit:1025" }));
    expect(createSmtpEmailSender).toHaveBeenCalledWith({
      url: "smtp://mailpit:1025",
      from: "noreply@mail.bardery.app",
    });
    expect(createAzureEmailSender).not.toHaveBeenCalled();
  });

  it("sends through Azure when the config names an endpoint, even in production", () => {
    createEmailSender(
      loadConfig({
        AZURE_COMMUNICATION_ENDPOINT: "https://bardery-staging.europe.communication.azure.com",
        NODE_ENV: "production",
      }),
    );
    expect(createAzureEmailSender).toHaveBeenCalledWith(
      expect.objectContaining({ from: "noreply@mail.bardery.app" }),
    );
    expect(createSmtpEmailSender).not.toHaveBeenCalled();
  });

  it("refuses to fall back to SMTP in production, naming the missing variable", () => {
    const config = loadConfig({ NODE_ENV: "production" });
    expect(() => createEmailSender(config)).toThrow(/AZURE_COMMUNICATION_ENDPOINT/);
    expect(createSmtpEmailSender).not.toHaveBeenCalled();
  });
});
