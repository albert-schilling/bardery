import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const hook = resolve(import.meta.dirname, "stop-hook.sh");
const repoRoot = resolve(import.meta.dirname, "../../..");

// A stand-in for pnpm on PATH: it records how it was called and answers like `pnpm validate`.
let bin: string;
beforeEach(() => {
  bin = mkdtempSync(join(tmpdir(), "stop-hook-"));
});
afterEach(() => {
  rmSync(bin, { recursive: true, force: true });
});

function runHook(validate: { output: string; exitCode: number }) {
  const pnpm = join(bin, "pnpm");
  writeFileSync(join(bin, "output"), validate.output);
  writeFileSync(
    pnpm,
    `#!/usr/bin/env bash
printf '%s\\n' "$PWD" "$*" "$NX_TUI" > "${bin}/call"
cat "${bin}/output"
exit ${validate.exitCode}
`,
  );
  chmodSync(pnpm, 0o755);
  const result = spawnSync(hook, {
    // Claude Code passes the hook's input as JSON on stdin; the hook doesn't need it.
    input: JSON.stringify({ hook_event_name: "Stop", stop_hook_active: false }),
    env: { ...process.env, PATH: `${bin}:${process.env["PATH"]}` },
    encoding: "utf8",
  });
  const [cwd, args, nxTui] = readFileSync(join(bin, "call"), "utf8").split("\n");
  return { ...result, call: { cwd, args, nxTui } };
}

describe("the Stop hook", () => {
  it("runs pnpm validate from the repository root without Nx's terminal UI", () => {
    const { call } = runHook({ output: "", exitCode: 0 });

    expect(call).toEqual({ cwd: repoRoot, args: "--silent validate", nxTui: "false" });
  });

  it("prints nothing and lets the turn end when validate passes", () => {
    const result = runHook({ output: "Successfully ran targets lint, typecheck", exitCode: 0 });

    expect(result).toMatchObject({ status: 0, stdout: "", stderr: "" });
  });

  it("returns the failures with exit code 2 when validate fails", () => {
    const failure =
      "src/a.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.";

    const result = runHook({ output: failure, exitCode: 1 });

    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("pnpm validate failed");
    expect(result.stderr).toContain(failure);
  });

  it("strips the colours that tools print in Nx's pseudo-terminal", () => {
    const result = runHook({ output: "\u001b[91merror\u001b[0m TS2322", exitCode: 1 });

    expect(result.stderr).toContain("error TS2322");
    expect(result.stderr).not.toContain("\u001b");
  });
});
