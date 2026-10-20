import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";

import { UnauthorizedError, withMockApi } from "~/lib/test-api";

import SignedIn from "./signed-in";

function renderGuarded(me: () => unknown) {
  const Stub = createRoutesStub([
    { Component: SignedIn, children: [{ path: "/", Component: () => <p>A signed-in page</p> }] },
    { path: "/sign-in", Component: () => <p>The sign-in page</p> },
  ]);
  render(<Stub />, { wrapper: withMockApi({ me }) });
}

describe("the signed-in guard", () => {
  it("shows its pages to a signed-in reader", async () => {
    renderGuarded(() => ({ id: "a1", email: "parent@example.com" }));

    expect(await screen.findByText("A signed-in page")).toBeInTheDocument();
  });

  it("sends an anonymous reader to the sign-in page", async () => {
    renderGuarded(() => {
      throw new UnauthorizedError();
    });

    expect(await screen.findByText("The sign-in page")).toBeInTheDocument();
    expect(screen.queryByText("A signed-in page")).not.toBeInTheDocument();
  });

  it("says so, and shows nothing, when the server fails", async () => {
    renderGuarded(() => {
      throw new Error("down");
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("The server didn't answer.");
    expect(screen.queryByText("A signed-in page")).not.toBeInTheDocument();
    expect(screen.queryByText("The sign-in page")).not.toBeInTheDocument();
  });
});
