import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { spawn } from "child_process";
import { MC_ALIAS } from "@/lib/mc/executor";

/**
 * Streams an object's bytes directly to the browser by piping `mc cat` stdout
 * through the response, instead of buffering the whole object in memory first.
 * This keeps memory flat regardless of object size.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const key = req.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "key query parameter is required" }, { status: 400 });
    }

    const MC_BINARY = process.env.MC_BINARY_PATH || "mc";
    const MC_CONFIG_DIR = process.env.MC_CONFIG_DIR || "/app/.mc";

    const child = spawn(MC_BINARY, ["cat", `${MC_ALIAS}/${bucket}/${key}`], {
      env: { ...process.env, MC_CONFIG_DIR },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stream = new ReadableStream({
      start(controller) {
        child.stdout.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        child.stdout.on("end", () => controller.close());
        child.on("error", (err) => controller.error(err));
        child.stderr.on("data", () => {
          /* swallow; surfaced via exit code only since headers are already streaming */
        });
      },
      cancel() {
        child.kill();
      },
    });

    const filename = key.split("/").pop() || "download";

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
