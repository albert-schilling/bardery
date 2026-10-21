import { fireEvent, render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { fakeAuth, withMockApi } from "~/lib/test-api";

import Home from "./home";

const me = () => ({ id: "a1", email: "parent@example.com" });

function renderHome(answers: Record<string, () => unknown>, auth = fakeAuth()) {
  const Stub = createRoutesStub([
    { path: "/", Component: Home },
    { path: "/sign-in", Component: () => <p>The sign-in page</p> },
  ]);
  render(<Stub />, { wrapper: withMockApi({ me, ...answers }, auth) });
}

describe("Home", () => {
  it("greets Bardery in a heading", () => {
    renderHome({ health: () => ({ status: "ok", version: "x" }) });

    expect(screen.getByRole("heading", { level: 1, name: "Hello, Bardery" })).toBeInTheDocument();
  });

  it("says who is signed in", async () => {
    renderHome({ health: () => ({ status: "ok", version: "x" }) });

    expect(await screen.findByText("Signed in as parent@example.com")).toBeInTheDocument();
  });

  it("signs out and goes to the sign-in page", async () => {
    const signOut = vi.fn(async () => {});
    renderHome({ health: () => ({ status: "ok", version: "x" }) }, fakeAuth({ signOut }));

    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByText("The sign-in page")).toBeInTheDocument();
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("stays and says so when signing out fails", async () => {
    const signOut = async () => {
      throw new Error("Something went wrong. Try again.");
    };
    renderHome({ health: () => ({ status: "ok", version: "x" }) }, fakeAuth({ signOut }));

    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
    expect(screen.queryByText("The sign-in page")).not.toBeInTheDocument();
  });

  it("shows the server's health answer", async () => {
    renderHome({ health: () => ({ status: "ok", version: "abc123" }) });

    expect(await screen.findByText("Server is ok, version abc123")).toBeInTheDocument();
  });

  it("says so when the server doesn't answer", async () => {
    renderHome({
      health: () => {
        throw new Error("down");
      },
    });

    expect(await screen.findByText("The server didn't answer.")).toHaveAttribute("role", "status");
  });
});
