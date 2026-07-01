import { spawn } from "child_process";

/**
 * Core executor for the MinIO Client (`mc`) binary.
 *
 * Design notes:
 * - We NEVER build shell strings. We always spawn with an argv array, so there is
 *   no shell interpolation / injection risk even with user-supplied bucket or object names.
 * - We always pass `--json` so output is machine-parseable (mc emits one JSON object
 *   per line — NDJSON — for most commands, especially list/admin operations).
 * - The configured alias (pointing at the operator's MinIO cluster) lives in a private
 *   mc config directory on disk (MC_CONFIG_DIR), set up once at boot from env vars.
 *   The browser never sees access/secret keys.
 */

export const MC_ALIAS = "console-target";

const MC_BINARY = process.env.MC_BINARY_PATH || "mc";
const MC_CONFIG_DIR = process.env.MC_CONFIG_DIR || "/app/.mc";
const DEFAULT_TIMEOUT_MS = 30_000;

let aliasReadyPromise: Promise<void> | null = null;

export function getMinioEnv() {
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  if (!endpoint || !accessKey || !secretKey) {
    throw new McError(
      "Server misconfigured: MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY must be set.",
      { code: "CONFIG_MISSING" }
    );
  }
  return { endpoint, accessKey, secretKey };
}

async function configureAlias(): Promise<void> {
  const { endpoint, accessKey, secretKey } = getMinioEnv();
  const insecure = process.env.MINIO_API_INSECURE === "true";

  const args = ["alias", "set", MC_ALIAS, endpoint, accessKey, secretKey, "--api", "S3v4"];
  if (insecure) args.push("--insecure");

  await mcRun(args);
}

export function ensureAliasConfigured(): Promise<void> {
  if (!aliasReadyPromise) {
    aliasReadyPromise = configureAlias().catch((err) => {
      // Allow retry on next call if it failed (e.g. transient network issue at boot).
      aliasReadyPromise = null;
      throw err;
    });
  }
  return aliasReadyPromise;
}

export class McError extends Error {
  code?: string;
  raw?: string;
  exitCode?: number | null;

  constructor(message: string, opts?: { code?: string; raw?: string; exitCode?: number | null }) {
    super(message);
    this.name = "McError";
    this.code = opts?.code;
    this.raw = opts?.raw;
    this.exitCode = opts?.exitCode;
  }
}

export interface McRunOptions {
  /** Abort the command after this many ms. Defaults to 30s. Use a higher value for long ops. */
  timeoutMs?: number;
  /** Called with each parsed JSON line as it arrives (for streaming progress). */
  onJsonLine?: (obj: unknown) => void;
  /** Skip JSON parsing and return raw stdout (for commands that don't support --json well). */
  raw?: boolean;
  /** Provide stdin content (used for piping policy JSON into `mc admin policy create`, etc). */
  stdin?: string;
}

export interface McRunResult<T = unknown> {
  /** All parsed JSON lines from stdout, in order. */
  lines: T[];
  /** Raw stdout text. */
  stdout: string;
  /** Raw stderr text. */
  stderr: string;
  exitCode: number;
}

/**
 * Run an `mc` subcommand against the configured alias.
 * `args` should NOT include the binary name or --json (added automatically unless raw=true).
 */
export async function mcRun<T = unknown>(args: string[], options: McRunOptions = {}): Promise<McRunResult<T>> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, onJsonLine, raw = false, stdin } = options;

  const finalArgs = raw ? args : [...args, "--json"];

  // Ensure alias is configured before running the command, unless we are setting it.
  const isSettingAlias = args[0] === "alias" && args[1] === "set";
  if (!isSettingAlias) {
    await ensureAliasConfigured();
  }

  // Log execution
  console.log(`[MC Exec] Running: mc ${finalArgs.join(" ")}`);

  return new Promise((resolve, reject) => {
    const child = spawn(MC_BINARY, finalArgs, {
      env: { ...process.env, MC_CONFIG_DIR },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      const errMessage = `mc command timed out after ${timeoutMs}ms: mc ${finalArgs.join(" ")}`;
      console.error(`[MC Exec] Timeout: ${errMessage}`);
      reject(new McError(errMessage, { code: "TIMEOUT" }));
    }, timeoutMs);

    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();

    const lines: T[] = [];
    let buffer = "";

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdout += text;
      if (raw) return;

      buffer += text;
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        try {
          const obj = JSON.parse(trimmed) as T;
          lines.push(obj);
          onJsonLine?.(obj);
        } catch {
          // Non-JSON line mixed into stdout; ignore for parsing purposes but it's preserved in raw stdout.
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.error(`[MC Exec] Spawn Error: Failed to launch mc binary: ${err.message}`);
      reject(new McError(`Failed to launch mc binary: ${err.message}`, { code: "SPAWN_ERROR" }));
    });

    child.on("close", (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      // flush trailing buffered line
      if (!raw && buffer.trim()) {
        try {
          const obj = JSON.parse(buffer.trim()) as T;
          lines.push(obj);
          onJsonLine?.(obj);
        } catch {
          /* ignore */
        }
      }

      if (exitCode !== 0) {
        // mc --json error format: {"status":"error","error":{"message":"...","cause":{"message":"..."}}}
        let message = stderr.trim() || `mc exited with code ${exitCode}`;
        let code: string | undefined;
        const errLine = lines.find(
          (l): l is T & { status: string; error?: { message?: string; cause?: { message?: string } } } =>
            typeof l === "object" && l !== null && (l as any).status === "error"
        );
        if (errLine) {
          const errObj = errLine as any;
          message = errObj.error?.cause?.message || errObj.error?.message || message;
          code = errObj.error?.code;
        }
        console.error(`[MC Exec] Error running: mc ${finalArgs.join(" ")}. Exit code: ${exitCode}. Error: ${message}`);
        reject(new McError(message, { code, raw: stdout + stderr, exitCode }));
        return;
      }

      console.log(`[MC Exec] Success: mc ${finalArgs.join(" ")}`);
      resolve({ lines, stdout, stderr, exitCode: exitCode ?? 0 });
    });
  });
}

/** Convenience: run an admin subcommand against the configured alias and return parsed JSON lines. */
export function mcAdmin<T = unknown>(subArgs: string[], options?: McRunOptions): Promise<McRunResult<T>> {
  return mcRun<T>(["admin", ...subArgs, MC_ALIAS], options);
}

/** Convenience: run a non-admin command, substituting `<alias>` for the configured alias where needed. */
export function mcWithAlias<T = unknown>(buildArgs: (alias: string) => string[], options?: McRunOptions): Promise<McRunResult<T>> {
  return mcRun<T>(buildArgs(MC_ALIAS), options);
}
