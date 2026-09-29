import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./home";

describe("Home", () => {
  it("greets Bardery in a heading", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1, name: "Hello, Bardery" })).toBeInTheDocument();
  });
});
