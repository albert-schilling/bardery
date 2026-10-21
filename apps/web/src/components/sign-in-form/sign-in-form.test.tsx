import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";

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

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("SignInForm", () => {
  it("emails a code, signs in with it, and goes to the home page", async () => {
    const sendCode = vi.fn(async () => {});
    const signIn = vi.fn(async () => {});
    renderForm(fakeAuth({ sendCode, signIn }));

    type("Email", "parent@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText("We emailed a code to parent@example.com.")).toBeInTheDocument();
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
      throw new Error("That code isn't right. Check it and try again.");
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

    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));

    await waitFor(() => expect(sendCode).toHaveBeenCalledTimes(2));
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
  });
});
