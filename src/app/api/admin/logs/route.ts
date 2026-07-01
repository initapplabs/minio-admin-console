import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { getSession } from "@/lib/auth/session";
import { MC_ALIAS, ensureAliasConfigured } from "@/lib/mc/executor";

/**
 * Streams `mc admin logs <alias>` as Server-Sent Events. This command tails
 * live server logs indefinitely, so we keep the child process alive for the
 * lifetime of the HTTP connection and kill it when the client disconnects.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("Not authenticated", { status: 401 });
  }

  const MC_BINARY = process.env.MC_BINARY_PATH || "mc";
  const MC_CONFIG_DIR = process.env.MC_CONFIG_DIR || "/app/.mc";
  const nodeFilter = req.nextUrl.searchParams.get("node");

  const args = ["admin", "logs", MC_ALIAS, "--json"];
  if (nodeFilter) args.push("--node", nodeFilter);

  try {
    await ensureAliasConfigured();
  } catch (err) {
    console.error("[Logs API] Failed to ensure mc alias is configured:", err);
    return new Response(
      JSON.stringify({
        status: "error",
        error: {
          message: "Unable to initialize admin client.",
          cause: {
            message: err instanceof Error ? err.message : String(err),
            error: {}
          },
          type: "fatal"
        }
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const child = spawn(MC_BINARY, args, {
    env: { ...process.env, MC_CONFIG_DIR },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream({
    start(controller) {
      child.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed) continue;
          controller.enqueue(encoder.encode(`data: ${trimmed}\n\n`));
        }
      });
      child.stderr.on("data", (chunk: Buffer) => {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(chunk.toString("utf8"))}\n\n`));
      });
      child.on("close", () => {
        controller.enqueue(encoder.encode(`event: closed\ndata: {}\n\n`));
        controller.close();
      });
      child.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      child.kill("SIGTERM");
    },
  });

  req.signal.addEventListener("abort", () => {
    child.kill("SIGTERM");
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
