// The PreToolUse hook of the Factory's implementer (.claude/agents/factory-implementer.md): the
// implementer may not change test files, so it can't make a test pass by weakening it. Test files
// are the `testFiles` globs in .claude/factory.json. A denied call tells the agent to stop and
// report the test instead. For Bash it catches commands that plainly write a file (redirects, rm,
// sed -i, git checkout, …), following `cd` and looking inside directories they remove or restore;
// the standards reviewer's cheat detection catches the rest.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, matchesGlob, relative, resolve } from "node:path";

type HookInput = { cwd?: string; tool_name?: string; tool_input?: Record<string, unknown> };
// A path a tool call may write; `recursive` when the command also changes what is inside it.
type Target = { path: string; recursive: boolean };

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
// Their last argument is a destination that keeps its other files.
const copyingPrograms = new Set(["mv", "cp", "ln"]);
const writingGitCommands = new Set(["checkout", "restore", "rm", "mv", "apply"]);
const prefixes = new Set(["sudo", "env", "command", "xargs", "nohup", "time"]);
const skippedDirectories = new Set(["node_modules", ".git", ".nx"]);

// The paths a shell command may write: redirect targets, and the arguments of writing programs,
// each resolved against the directory its part of the command runs in. Undefined when a `cd` goes
// somewhere this can't follow before something is written.
function bashTargets(command: string, cwd: string): Target[] | undefined {
  const targets: Target[] = [];
  let dir: string | undefined = cwd;
  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    const written = [...segment.matchAll(/>>?\|?\s*(['"]?)([^\s'";&|<>()]+)\1/g)].map((m) => ({
      path: m[2]!,
      recursive: false,
    }));
    const words = segment
      .trim()
      .split(/\s+/)
      .map((word) => word.replace(/^['"]|['"]$/g, ""));
    while (words.length > 0 && (prefixes.has(words[0]!) || /^\w+=/.test(words[0]!))) words.shift();
    const [program = "", ...args] = words;
    if (program === "cd" || program === "pushd") {
      const to = args[0];
      dir =
        to === undefined || /^[-~$]/.test(to) || dir === undefined ? undefined : resolve(dir, to);
      continue;
    }
    const inPlace = ["sed", "perl"].includes(program) && args.some((arg) => /^-\w*i/.test(arg));
    const gitWrite = program === "git" && writingGitCommands.has(args[0] ?? "");
    if (writingPrograms.has(program) || inPlace || gitWrite) {
      const destination = copyingPrograms.has(program) ? args.length - 1 : -1;
      written.push(...args.map((path, i) => ({ path, recursive: i !== destination })));
    }
    if (written.length === 0) continue;
    if (dir === undefined) return undefined;
    const from = dir;
    targets.push(
      ...written.map(({ path, recursive }) => ({ path: resolve(from, path), recursive })),
    );
  }
  return targets;
}

function targetsOf({ cwd = root, tool_name, tool_input = {} }: HookInput): Target[] | undefined {
  const command = tool_input["command"];
  if (tool_name === "Bash") return typeof command === "string" ? bashTargets(command, cwd) : [];
  const path = tool_input["file_path"] ?? tool_input["notebook_path"];
  return typeof path === "string" ? [{ path: resolve(cwd, path), recursive: false }] : [];
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function deny(reason: string): void {
  const decision = { hookEventName: "PreToolUse", permissionDecision: "deny" };
  const output = { hookSpecificOutput: { ...decision, permissionDecisionReason: reason } };
  process.stdout.write(JSON.stringify(output));
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

const isTestFile = (fromRoot: string) => testFiles.some((glob) => matchesGlob(fromRoot, glob));

// The first test file at or, for a recursive target, below the path, relative to the project.
function testFileAt({ path, recursive }: Target): string | undefined {
  const fromRoot = relative(root, path);
  if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) return undefined;
  if (isTestFile(fromRoot)) return fromRoot;
  if (!recursive || !isDirectory(path)) return undefined;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (skippedDirectories.has(entry.name)) continue;
    const found = testFileAt({ path: join(path, entry.name), recursive: entry.isDirectory() });
    if (found !== undefined) return found;
  }
  return undefined;
}

const targets = targetsOf(input);
const testFile = targets?.map(testFileAt).find((found) => found !== undefined);

if (targets === undefined) {
  deny(
    "This command changes to a directory the hook can't follow (`cd -`, `~` or a variable) and " +
      "then writes, so it can't tell whether it touches a test file. Use paths from the project " +
      "directory instead.",
  );
} else if (testFile !== undefined) {
  deny(
    `${testFile} is a test file, and the implementer doesn't change tests. If a test is wrong ` +
      "or can't pass, stop and return `blocked`, naming the test and why.",
  );
}
