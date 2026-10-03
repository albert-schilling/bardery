import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const oxlint = join(repoRoot, "node_modules/.bin/oxlint");

// Lints a probe file in a copy of the repo layout, so a concurrent `lint` run never sees it.
let workspace: string;

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), "layers-"));
  const config = await readFile(join(repoRoot, ".oxlintrc.json"), "utf8");
  // Type-aware rules need oxlint-tsgolint next to the config; the layer rules don't.
  await writeFile(
    join(workspace, ".oxlintrc.json"),
    config.replace('"typeAware": true', '"typeAware": false'),
  );
});

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
});

async function lintImport(from: string, specifier: string): Promise<string> {
  const dir = join(workspace, "apps/server/src", from);
  await mkdir(dir, { recursive: true });
  const file = join(dir, `probe-${specifier.replaceAll("/", "-")}.ts`);
  await writeFile(file, `export * from "${specifier}";\n`);
  try {
    await promisify(execFile)(oxlint, [file], { cwd: workspace });
    return "ok";
  } catch (error) {
    return String((error as { stdout: string }).stdout);
  }
}

describe("the server's layer rules (Q46)", () => {
  it.each([
    ["routers", "~/services/story"],
    ["routers", "~/domain/storyline"],
    ["services", "~/repositories/part"],
    ["services", "~/providers/text-generator"],
    ["repositories", "~/db/schema"],
    ["jobs", "~/services/illustrate"],
    ["domain", "~/domain/age-band"],
  ])("lets %s/ import %s", async (from, specifier) => {
    expect(await lintImport(from, specifier)).toBe("ok");
  });

  it.each([
    ["domain", "~/repositories/part"],
    ["domain", "~/config"],
    ["routers", "~/repositories/part"],
    ["services", "~/routers/story"],
    ["repositories", "~/services/story"],
    ["jobs", "~/providers/illustrator"],
  ])("stops %s/ importing %s", async (from, specifier) => {
    expect(await lintImport(from, specifier)).toContain("no-restricted-imports");
  });
});
