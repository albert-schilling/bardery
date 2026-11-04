// The PreToolUse hook of the Factory's implementer (.claude/agents/factory-implementer.md): the
// implementer may not change test files, so it can't make a test pass by weakening it. Test files
// are the `testFiles` globs in .claude/factory.json. A denied call tells the agent to stop and
// report the test instead. For Bash it catches commands that plainly write a file (redirects, rm,
// sed -i, git checkout, …); the standards reviewer's cheat detection catches the rest.
import { readFileSync } from "node:fs";
import { isAbsolute, matchesGlob, relative, resolve } from "node:path";

type HookInput = { cwd?: string; tool_name?: string; tool_input?: Record<string, unknown> };

// Claude Code sets it for hooks; this file is reached through a symlink, so its own path won't do.
const root = process.env["CLAUDE_PROJECT_DIR"] ?? process.cwd();

function readTestFiles(): string[] {
  const config: unknown = JSON.parse(readFileSync(resolve(root, ".claude/factory.json"), "utf8"));
  const globs: unknown = (config as { testFiles?: unknown }).testFiles;
  if (!Array.isArray(globs) || !globs.every((glob) => typeof glob === "string")) {
    throw new Error("testFiles must be a list of globs");
  }
  return globs;
}

const writingPrograms = new Set([
  "rm",
  "mv",
  "cp",
  "tee",
  "touch",
  "truncate",
  "ln",
  "dd",
  "patch",
]);
const writingGitCommands = new Set(["checkout", "restore", "rm", "mv", "apply"]);
const prefixes = new Set(["sudo", "env", "command", "xargs", "nohup", "time"]);

// The paths a shell command may write: redirect targets, and the arguments of writing programs.
function bashTargets(command: string): string[] {
  const targets = [...command.matchAll(/>>?\|?\s*(['"]?)([^\s'";&|<>()]+)\1/g)].map((m) => m[2]!);
  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    const words = segment
      .trim()
      .split(/\s+/)
      .map((word) => word.replace(/^['"]|['"]$/g, ""));
    while (words.length > 0 && (prefixes.has(words[0]!) || /^\w+=/.test(words[0]!))) words.shift();
    const [program = "", ...args] = words;
    const inPlace = ["sed", "perl"].includes(program) && args.some((arg) => /^-\w*i/.test(arg));
    const gitWrite = program === "git" && writingGitCommands.has(args[0] ?? "");
    if (writingPrograms.has(program) || inPlace || gitWrite) targets.push(...args);
  }
  return targets;
}

function touchedPaths({ tool_name, tool_input = {} }: HookInput): string[] {
  const command = tool_input["command"];
  if (tool_name === "Bash") return typeof command === "string" ? bashTargets(command) : [];
  const path = tool_input["file_path"] ?? tool_input["notebook_path"];
  return typeof path === "string" ? [path] : [];
}

const input = JSON.parse(readFileSync(0, "utf8")) as HookInput;
let testFiles: string[];
try {
  testFiles = readTestFiles();
} catch (error) {
  process.stderr.write(
    `Can't read the test file globs from .claude/factory.json: ${String(error)}\n`,
  );
  process.exit(2);
}

const testFile = touchedPaths(input).find((path) => {
  const fromRoot = relative(root, resolve(input.cwd ?? root, path));
  if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) return false;
  return testFiles.some((glob) => matchesGlob(fromRoot, glob));
});

if (testFile !== undefined) {
  const reason =
    `${testFile} is a test file, and the implementer doesn't change tests. If a test is wrong ` +
    "or can't pass, stop and return `blocked`, naming the test and why.";
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
}
