import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { withMockApi } from "~/lib/test-api";

import Home from "./home";

describe("Home", () => {
  it("greets Bardery in a heading", () => {
    render(<Home />, { wrapper: withMockApi({ health: () => ({ status: "ok", version: "x" }) }) });

    expect(screen.getByRole("heading", { level: 1, name: "Hello, Bardery" })).toBeInTheDocument();
  });

  it("shows the server's health answer", async () => {
    render(<Home />, {
      wrapper: withMockApi({ health: () => ({ status: "ok", version: "abc123" }) }),
    });

    expect(await screen.findByText("Server is ok, version abc123")).toBeInTheDocument();
  });

  it("says so when the server doesn't answer", async () => {
    render(<Home />, {
      wrapper: withMockApi({
        health: () => {
          throw new Error("down");
        },
      }),
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("The server didn't answer.");
  });
});
