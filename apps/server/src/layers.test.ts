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

async function lintSource(dir: string, source: string): Promise<string> {
  await mkdir(join(workspace, dir), { recursive: true });
  const file = join(workspace, dir, "probe.ts");
  await writeFile(file, source);
  try {
    await promisify(execFile)(oxlint, [file], { cwd: workspace });
    return "ok";
  } catch (error) {
    return String((error as { stdout: string }).stdout);
  }
}

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

describe("the server's layer rules", () => {
  it.each([
    ["routers", "~/services/story"],
    ["services", "~/repositories/part"],
    ["services", "~/providers/text-generator"],
    ["services", "~/domain/storyline"],
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
    ["routers", "~/domain/storyline"],
    ["services", "~/routers/story"],
    ["services", "~/prompts/part"],
    ["services", "~/db/schema"],
    ["repositories", "~/services/story"],
    ["repositories", "~/domain/storyline"],
    ["providers", "~/prompts/part"],
    ["prompts", "~/domain/age-band"],
    ["db", "~/domain/age-band"],
    ["jobs", "~/providers/illustrator"],
    ["jobs", "~/domain/storyline"],
  ])("stops %s/ importing %s", async (from, specifier) => {
    expect(await lintImport(from, specifier)).toContain("no-restricted-imports");
  });
});

describe("the server's package rules", () => {
  it("lets the server import @bardery/schemas", async () => {
    expect(await lintImport("routers", "@bardery/schemas")).toBe("ok");
  });

  it("stops the server importing @bardery/client", async () => {
    expect(await lintImport("services", "@bardery/client")).toContain("no-restricted-imports");
  });
});

// The rules for the packages and the web app live here too: this is the one place that lints probe files.
describe("the web app's boundary to the server", () => {
  it("lets the web app import a type from the server", async () => {
    const source =
      'import type { AppRouter } from "@bardery/server/router";\nexport type T = AppRouter;\n';
    expect(await lintSource("apps/web/src", source)).toBe("ok");
  });

  it("stops the web app importing a runtime value from the server", async () => {
    const source =
      'import { appRouter } from "@bardery/server/router";\nexport const r = appRouter;\n';
    expect(await lintSource("apps/web/src", source)).toContain("no-restricted-imports");
  });
});

describe("the schemas package's dependencies", () => {
  it("stops @bardery/schemas importing the server's other packages", async () => {
    const source = 'export * from "@bardery/client";\n';
    expect(await lintSource("packages/shared/schemas/src", source)).toContain(
      "no-restricted-imports",
    );
  });
});
