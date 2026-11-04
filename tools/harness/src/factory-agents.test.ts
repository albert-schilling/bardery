import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, matchesGlob, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "../../..");
const agentsDir = join(repoRoot, ".claude/agents");

// The models and effort the Factory grilling record (docs/grilling/2026-11-04-factory-session.md) sets.
const sonnet = "claude-sonnet-5-5";
const opus = "claude-opus-5-5";
const expected = {
  "factory-researcher": { model: sonnet, effort: "low" },
  "factory-planner": { model: opus, effort: "high" },
  "factory-test-writer": { model: opus, effort: "high" },
  "factory-implementer": { model: sonnet, effort: "medium" },
  "factory-reviewer-spec": { model: opus, effort: "high" },
  "factory-reviewer-standards": { model: opus, effort: "high" },
};

function agent(name: string) {
  const text = readFileSync(join(agentsDir, `${name}.md`), "utf8");
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "";
  const field = (key: string) => new RegExp(`^${key}: (.*)$`, "m").exec(frontmatter)?.[1];
  return { text, frontmatter, field };
}

describe("the Factory's agents", () => {
  it("are exactly the six phase agents", () => {
    const names = readdirSync(agentsDir).filter((file) => file.startsWith("factory-"));

    expect(names.toSorted()).toEqual(
      Object.keys(expected)
        .map((name) => `${name}.md`)
        .toSorted(),
    );
  });

  it.each(Object.entries(expected))("%s has its model, effort and description", (name, want) => {
    const { field } = agent(name);

    expect({ name: field("name"), model: field("model"), effort: field("effort") }).toEqual({
      name,
      ...want,
    });
    expect(field("description")?.length).toBeGreaterThan(80);
  });

  // Sub-agents return to the orchestrator: they can't ask the person or start other agents.
  it.each(Object.keys(expected))("%s lists its tools, without Agent or AskUserQuestion", (name) => {
    const tools = agent(name).field("tools")?.split(/,\s*/) ?? [];

    expect(tools).toContain("Read");
    expect(tools).not.toContain("Agent");
    expect(tools).not.toContain("AskUserQuestion");
  });

  it.each(Object.keys(expected))("%s preloads the shared result format", (name) => {
    expect(agent(name).frontmatter).toMatch(/^skills:\n {2}- factory-result$/m);
  });

  it("guards the implementer's edits with the test-file hook", () => {
    const { frontmatter } = agent("factory-implementer");
    const script = /"\$CLAUDE_PROJECT_DIR"\/(\S+\.ts)/.exec(frontmatter)?.[1];

    expect(frontmatter).toContain('matcher: "Edit|Write|MultiEdit|NotebookEdit|Bash"');
    expect(script).toBeDefined();
    expect(existsSync(join(repoRoot, script!))).toBe(true);
  });
});

describe("the Factory's generic pieces", () => {
  const config: unknown = JSON.parse(readFileSync(join(repoRoot, ".claude/factory.json"), "utf8"));
  // Every path, glob, label and command in the config. Single words ("friction") are also
  // the Factory's own vocabulary, so only values with a separator count as this repository's.
  const specifics = JSON.stringify(config)
    .match(/"[^"]*"/g)!
    .map((quoted) => quoted.slice(1, -1))
    .filter((value) => /[/. -]/.test(value) && /\w/.test(value));
  const generic = [
    ...Object.keys(expected).map((name) => `.claude/agents/${name}.md`),
    ".agents/skills/factory-result/SKILL.md",
    ".claude/hooks/protect-test-files.ts",
  ];

  it.each(generic)("%s names nothing the config holds", (file) => {
    const text = readFileSync(join(repoRoot, file), "utf8");

    expect(specifics.filter((value) => text.includes(value))).toEqual([]);
    expect(text).not.toMatch(/bardery/i);
  });
});

describe("the Factory config", () => {
  it("protects every tracked test, test helper and Vitest file", () => {
    const { testFiles } = JSON.parse(
      readFileSync(join(repoRoot, ".claude/factory.json"), "utf8"),
    ) as { testFiles: string[] };
    const tracked = spawnSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" }).stdout;
    const testSupport = tracked
      .split("\n")
      .filter((file) => /(^|\/)(test-|vitest\.)|\.test\.|__snapshots__/.test(file));

    expect(testSupport.length).toBeGreaterThan(0);
    expect(
      testSupport.filter((file) => !testFiles.some((glob) => matchesGlob(file, glob))),
    ).toEqual([]);
  });
});
