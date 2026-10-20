import { createServer, type Server } from "node:net";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { createSmtpEmailSender } from "~/providers/smtp-email-sender";

let server: Server | undefined;
afterEach(() => new Promise((resolve) => (server ? server.close(resolve) : resolve(undefined))));

/** A minimal SMTP server that accepts one message and resolves with the data it received. */
function listen(): Promise<{ port: number; message: Promise<string> }> {
  return new Promise((resolveListening) => {
    let resolveMessage: (data: string) => void;
    const message = new Promise<string>((resolve) => (resolveMessage = resolve));
    server = createServer((socket) => {
      let data = "";
      let inData = false;
      socket.write("220 test\r\n");
      socket.on("data", (chunk) => {
        const text = chunk.toString();
        if (inData) {
          data += text;
          if (data.endsWith("\r\n.\r\n")) {
            inData = false;
            socket.write("250 ok\r\n");
            resolveMessage(data);
          }
          return;
        }
        for (const line of text.split("\r\n").filter(Boolean)) {
          const command = line.slice(0, 4).toUpperCase();
          if (command === "EHLO" || command === "HELO") socket.write("250 test\r\n");
          else if (command === "DATA") {
            inData = true;
            socket.write("354 go\r\n");
          } else if (command === "QUIT") socket.end("221 bye\r\n");
          else socket.write("250 ok\r\n");
        }
      });
    }).listen(0, "127.0.0.1", () =>
      resolveListening({ port: (server!.address() as AddressInfo).port, message }),
    );
  });
}

describe("the SMTP email sender", () => {
  it("sends the email from the configured address", async () => {
    const { port, message } = await listen();
    const sender = createSmtpEmailSender({
      url: `smtp://127.0.0.1:${port}`,
      from: "noreply@mail.bardery.app",
    });
    await sender.send({ to: "me@example.com", subject: "Hello", text: "Body text" });
    const data = await message;
    expect(data).toContain("From: noreply@mail.bardery.app");
    expect(data).toContain("To: me@example.com");
    expect(data).toContain("Subject: Hello");
    expect(data).toContain("Body text");
  });
});
