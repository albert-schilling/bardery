import { describe, expect, it } from "vitest";

import { bem } from "./bem";

describe("bem", () => {
  it("returns the block or element alone when there are no modifiers", () => {
    expect(bem("greeting")).toBe("greeting");
    expect(bem("greeting__title")).toBe("greeting__title");
  });

  it("adds a modifier class for each enabled modifier", () => {
    expect(bem("greeting", { large: true, muted: true })).toBe(
      "greeting greeting--large greeting--muted",
    );
  });

  it("leaves out disabled and missing modifiers", () => {
    expect(bem("greeting", { large: false, muted: undefined })).toBe("greeting");
  });

  it("turns camelCase modifier names into kebab-case", () => {
    expect(bem("greeting__title", { extraLarge: true })).toBe(
      "greeting__title greeting__title--extra-large",
    );
  });
});
