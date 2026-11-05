import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, matchesGlob, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "../../..");
const config: unknown = JSON.parse(readFileSync(join(repoRoot, ".agents/factory.json"), "utf8"));

describe("the Factory config", () => {
  it("protects every tracked test, test helper and Vitest file", () => {
    const { testFiles } = config as { testFiles: string[] };
    const tracked = spawnSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" }).stdout;
    const testSupport = tracked
      .split("\n")
      // Installed skills are not Bardery's tests: the Factory's `hooks/test-files.mjs` only looks like one.
      .filter((file) => !file.startsWith(".agents/skills/"))
      .filter((file) => /(^|\/)(test-|vitest\.)|\.test\.|__snapshots__/.test(file));

    expect(testSupport.length).toBeGreaterThan(0);
    expect(
      testSupport.filter((file) => !testFiles.some((glob) => matchesGlob(file, glob))),
    ).toEqual([]);
  });
});
