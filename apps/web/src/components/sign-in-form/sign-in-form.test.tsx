import { fireEvent, render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Auth } from "~/lib/auth";
import { fakeAuth, withMockApi } from "~/lib/test-api";

import { SignInForm } from "./sign-in-form";

function renderForm(auth: Auth) {
  const Stub = createRoutesStub([
    { path: "/sign-in", Component: SignInForm },
    { path: "/", Component: () => <p>The home page</p> },
  ]);
  render(<Stub initialEntries={["/sign-in"]} />, { wrapper: withMockApi({}, auth) });
}

/** A call that stays pending until the test finishes it. */
function pending() {
  let finish = () => {};
  const promise = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return { call: vi.fn(() => promise), finish };
}

/** The live region that announces what the busy button says; empty while nothing is pending. */
function announcement() {
  return screen.getAllByRole("status").find((each) => each.classList.contains("visually-hidden"));
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** A time today, as the form shows it in the test's locale and time zone. */
function at(hours: number, minutes: number): string {
  return new Date(2026, 10, 13, hours, minutes).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

describe("SignInForm", () => {
  beforeEach(() => {
    // Only the clock: the queries' own timers stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 13, 10, 52));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emails a code, signs in with it, and goes to the home page", async () => {
    const sendCode = vi.fn(async () => {});
    const signIn = vi.fn(async () => {});
    renderForm(fakeAuth({ sendCode, signIn }));

    type("Email", "parent@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText(/^We emailed a code/)).toHaveTextContent(
      `We emailed a code to parent@example.com at ${at(10, 52)}. It works until ${at(11, 7)}.`,
    );
    type("Code", "123456");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("The home page")).toBeInTheDocument();
    expect(sendCode).toHaveBeenCalledWith("parent@example.com");
    expect(signIn).toHaveBeenCalledWith("parent@example.com", "123456");
  });

  it("stays on the email step and says why when no code could be sent", async () => {
    const sendCode = async () => {
      throw new Error("Too many tries. Wait a while, then try again.");
    };
    renderForm(fakeAuth({ sendCode }));

    type("Email", "parent@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many tries.");
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("says why a code failed, and lets them start again with another email", async () => {
    const signIn = async () => {
      throw new Error("That code isn't right. Check it, and use the code from the newest email.");
    };
    renderForm(fakeAuth({ signIn }));
    type("Email", "parent@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByLabelText("Code");
    type("Code", "000000");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That code isn't right.");

    fireEvent.click(screen.getByRole("button", { name: "Use another email" }));
    expect(screen.getByLabelText("Email")).toHaveValue("parent@example.com");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("sends a new code to the same email, clearing the old code and its error", async () => {
    const sendCode = vi.fn(async () => {});
    const signIn = async () => {
      throw new Error("That code no longer works. Send a new one.");
    };
    renderForm(fakeAuth({ sendCode, signIn }));
    type("Email", "parent@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByLabelText("Code");
    type("Code", "000000");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("alert");
    vi.setSystemTime(new Date(2026, 10, 13, 10, 58));

    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));

    expect(await screen.findByText(/We emailed a new code/)).toHaveTextContent(
      `We emailed a new code to parent@example.com at ${at(10, 58)}. It works until ${at(11, 13)}, and earlier codes no longer do.`,
    );
    expect(screen.getByText(/^We emailed a new code/)).toHaveAttribute("role", "status");
    expect(sendCode).toHaveBeenCalledTimes(2);
    expect(sendCode).toHaveBeenLastCalledWith("parent@example.com");
    expect(screen.getByLabelText("Code")).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says why when a new code can't be sent", async () => {
    const sendCode = vi
      .fn<(email: string) => Promise<void>>()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error("Too many tries. Wait a while, then try again."));
    renderForm(fakeAuth({ sendCode }));
    type("Email", "parent@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByLabelText("Code");

    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many tries.");
    expect(screen.getByText(/^We emailed a code/)).toHaveTextContent(
      /^We emailed a code to parent@example.com/,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use another email" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables the button and says so while a code is being sent", async () => {
    const sendCode = pending();
    renderForm(fakeAuth({ sendCode: sendCode.call }));
    type("Email", "parent@example.com");

    fireEvent.click(screen.getByRole("button", { name: "Send code" }));

    expect(await screen.findByRole("button", { name: "Sending code…" })).toBeDisabled();
    expect(announcement()).toHaveTextContent("Sending code…");

    sendCode.finish();

    expect(await screen.findByLabelText("Code")).toBeInTheDocument();
    expect(announcement()).toHaveTextContent("");
  });

  it("disables both code-step buttons while signing in", async () => {
    const signIn = pending();
    renderForm(fakeAuth({ signIn: signIn.call }));
    type("Email", "parent@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByLabelText("Code");
    type("Code", "123456");

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("button", { name: "Signing in…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send a new code" })).toBeDisabled();
    expect(announcement()).toHaveTextContent("Signing in…");

    signIn.finish();
    expect(await screen.findByText("The home page")).toBeInTheDocument();
  });

  it("disables both code-step buttons while a new code is being sent", async () => {
    const resend = pending();
    const sendCode = vi
      .fn<(email: string) => Promise<void>>()
      .mockResolvedValueOnce()
      .mockImplementationOnce(resend.call);
    renderForm(fakeAuth({ sendCode }));
    type("Email", "parent@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByLabelText("Code");

    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));

    expect(await screen.findByRole("button", { name: "Sending a new code…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    expect(announcement()).toHaveTextContent("Sending a new code…");

    resend.finish();
    expect(await screen.findByRole("button", { name: "Send a new code" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });
});
