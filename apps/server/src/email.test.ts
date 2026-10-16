import { describe, expect, it } from "vitest";

import { loadConfig } from "~/config";
import { createEmailSender } from "~/email";

describe("createEmailSender", () => {
  it("sends through SMTP locally, without an Azure endpoint", () => {
    expect(() => createEmailSender(loadConfig({}))).not.toThrow();
  });

  it("sends through Azure when the config names an endpoint", () => {
    const config = loadConfig({
      AZURE_COMMUNICATION_ENDPOINT: "https://bardery-staging.europe.communication.azure.com",
      NODE_ENV: "production",
    });
    expect(() => createEmailSender(config)).not.toThrow();
  });

  it("refuses to fall back to SMTP in production, naming the missing variable", () => {
    const config = loadConfig({ NODE_ENV: "production" });
    expect(() => createEmailSender(config)).toThrow(/AZURE_COMMUNICATION_ENDPOINT/);
  });
});
