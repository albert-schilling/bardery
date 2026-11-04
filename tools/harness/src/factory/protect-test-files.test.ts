import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const hook = resolve(import.meta.dirname, "protect-test-files.ts");

// A throwaway project with its own Factory config, so the tests don't depend on this repository's.
let project: string;
beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "protect-test-files-"));
  mkdirSync(join(project, ".claude"));
  writeFileSync(
    join(project, ".claude/factory.json"),
    JSON.stringify({ testFiles: ["**/*.test.ts", "**/fixtures/**"] }),
  );
});
afterEach(() => {
  rmSync(project, { recursive: true, force: true });
});

function runHook(tool_name: string, tool_input: Record<string, unknown>) {
  const result = spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ hook_event_name: "PreToolUse", cwd: project, tool_name, tool_input }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: project },
    encoding: "utf8",
  });
  const decision = result.stdout === "" ? undefined : JSON.parse(result.stdout);
  return { status: result.status, stderr: result.stderr, decision };
}

describe("the implementer's test-file hook", () => {
  it.each([
    ["Edit", { file_path: "src/story.test.ts" }],
    ["Write", { file_path: "src/new.test.ts" }],
    ["MultiEdit", { file_path: "src/fixtures/story.json" }],
  ])("denies %s on a test file and tells the agent to stop and report", (tool, input) => {
    const { status, decision } = runHook(tool, {
      ...input,
      file_path: join(project, input.file_path),
    });

    expect(status).toBe(0);
    expect(decision.hookSpecificOutput).toMatchObject({
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
    });
    expect(decision.hookSpecificOutput.permissionDecisionReason).toContain(input.file_path);
    expect(decision.hookSpecificOutput.permissionDecisionReason).toContain("`blocked`");
  });

  it("allows edits to source files", () => {
    expect(runHook("Edit", { file_path: join(project, "src/story.ts") })).toMatchObject({
      status: 0,
      decision: undefined,
    });
  });

  it("allows a file outside the project, even one named like a test", () => {
    const outside = join(tmpdir(), "elsewhere.test.ts");

    expect(runHook("Write", { file_path: outside }).decision).toBeUndefined();
  });

  it.each([
    "cat > src/story.test.ts <<'EOF'\nit('passes', () => {})\nEOF",
    "echo 'it.skip' >> src/story.test.ts",
    "sed -i 's/toBe(1)/toBe(2)/' src/story.test.ts",
    "git checkout main -- src/story.test.ts",
    "cd src && rm -f story.test.ts",
    "CI=1 xargs rm < list.txt src/fixtures/a.json",
  ])("denies the shell command %j", (command) => {
    const { decision } = runHook("Bash", { command });

    expect(decision?.hookSpecificOutput.permissionDecision).toBe("deny");
  });

  it.each([
    "pnpm vitest run src/story.test.ts 2>&1 | tail -20",
    "cat src/story.test.ts",
    "git diff -- src/story.test.ts",
    "sed -n '1,20p' src/story.test.ts",
    "echo done > src/story.ts",
  ])("allows the shell command %j", (command) => {
    expect(runHook("Bash", { command }).decision).toBeUndefined();
  });

  it("blocks every call when the config can't be read, rather than letting edits through", () => {
    rmSync(join(project, ".claude/factory.json"));

    const result = runHook("Edit", { file_path: join(project, "src/story.ts") });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain(".claude/factory.json");
  });
});
