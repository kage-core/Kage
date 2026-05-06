import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export interface NpmReleaseOptions {
  publish: boolean;
  push: boolean;
  smoke: boolean;
  cache: string;
}

export interface NpmReleaseContext extends NpmReleaseOptions {
  branch: string;
  packageName: string;
  version: string;
}

export interface ReleaseStep {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  expectEmptyStdout?: boolean;
  retries?: number;
  retryDelayMs?: number;
}

const DEFAULT_CACHE = "/private/tmp/kage-npm-cache";

export function parseReleaseArgs(argv: string[]): NpmReleaseOptions {
  const options: NpmReleaseOptions = {
    publish: false,
    push: false,
    smoke: false,
    cache: DEFAULT_CACHE,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--publish") options.publish = true;
    else if (arg === "--dry-run") options.publish = false;
    else if (arg === "--push") options.push = true;
    else if (arg === "--smoke") options.smoke = true;
    else if (arg === "--cache") {
      const value = argv[index + 1];
      if (!value) throw new Error("--cache requires a path");
      options.cache = value;
      index += 1;
    } else {
      throw new Error(`Unknown release option: ${arg}`);
    }
  }
  return options;
}

export function buildNpmReleasePlan(context: NpmReleaseContext): ReleaseStep[] {
  const gitEnv = { GIT_EDITOR: "true" };
  const steps: ReleaseStep[] = [
    { name: "ensure clean worktree", command: "git", args: ["status", "--porcelain", "-uall"], env: gitEnv, expectEmptyStdout: true },
    { name: "fetch remote branch", command: "git", args: ["fetch", "origin", context.branch], env: gitEnv },
    { name: "ensure branch contains remote", command: "git", args: ["merge-base", "--is-ancestor", `origin/${context.branch}`, "HEAD"], env: gitEnv },
    { name: "run package tests", command: "npm", args: ["test"] },
    { name: "pack dry run", command: "npm", args: ["--cache", context.cache, "pack", "--dry-run"] },
  ];

  if (context.push) {
    steps.push({ name: "push branch", command: "git", args: ["push", "origin", context.branch], env: gitEnv });
  }
  if (context.publish) {
    steps.push(
      { name: "publish package", command: "npm", args: ["--cache", context.cache, "publish", "--access", "public"] },
      { name: "verify npm version", command: "npm", args: ["view", `${context.packageName}@${context.version}`, "version"], retries: 10, retryDelayMs: 3000 }
    );
    if (context.smoke) {
      steps.push({
        name: "smoke install published package",
        command: "npm",
        args: ["--cache", context.cache, "install", "--prefix", smokeInstallDir(context.version), `${context.packageName}@${context.version}`],
      });
    }
  }
  return steps;
}

function smokeInstallDir(version: string): string {
  return join(tmpdir(), `kage-npm-smoke-${version}`);
}

function stdout(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function packageMetadata(packageDir: string): { name: string; version: string } {
  const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8")) as { name?: unknown; version?: unknown };
  if (typeof pkg.name !== "string" || typeof pkg.version !== "string") {
    throw new Error("package.json must contain string name and version");
  }
  return { name: pkg.name, version: pkg.version };
}

function runStep(step: ReleaseStep, cwd: string): void {
  console.log(`release:npm: ${step.name}`);
  const attempts = Math.max(1, (step.retries ?? 0) + 1);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (step.expectEmptyStdout) {
        const output = execFileSync(step.command, step.args, {
          cwd,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "inherit"],
          env: { ...process.env, ...step.env },
        }).trim();
        if (output) throw new Error(`release:npm: ${step.name} failed because output was not empty:\n${output}`);
        return;
      }
      execFileSync(step.command, step.args, {
        cwd,
        stdio: "inherit",
        env: { ...process.env, ...step.env },
      });
      return;
    } catch (error) {
      if (attempt >= attempts) throw error;
      console.log(`release:npm: ${step.name} retry ${attempt}/${attempts - 1}`);
      sleepMs(step.retryDelayMs ?? 1000);
    }
  }
}

function sleepMs(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

export function runNpmRelease(argv = process.argv.slice(2), packageDir = process.cwd()): void {
  const options = parseReleaseArgs(argv);
  const repoRoot = stdout("git", ["rev-parse", "--show-toplevel"], packageDir);
  const branch = stdout("git", ["branch", "--show-current"], repoRoot);
  if (!branch) throw new Error("npm release requires a named git branch");
  mkdirSync(options.cache, { recursive: true });
  if (options.smoke) mkdirSync(smokeInstallDir(packageMetadata(packageDir).version), { recursive: true });

  const metadata = packageMetadata(packageDir);
  const plan = buildNpmReleasePlan({ ...options, branch, packageName: metadata.name, version: metadata.version });
  console.log(`release:npm: package ${metadata.name}@${metadata.version}`);
  console.log(`release:npm: mode ${options.publish ? "publish" : "dry-run"}`);
  for (const step of plan) runStep(step, repoRoot === resolve(packageDir, "..") ? packageDir : repoRoot);
}

if (process.argv[1] && process.argv[1].endsWith("release.js")) {
  try {
    runNpmRelease();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}
