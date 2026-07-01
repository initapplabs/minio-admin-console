import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { listObjects, deleteObject, createFolder } from "@/lib/mc/objects";
import { MC_ALIAS } from "@/lib/mc/executor";
import { mcRun } from "@/lib/mc/executor";

export async function GET(req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const prefix = req.nextUrl.searchParams.get("prefix") ?? "";
    const recursive = req.nextUrl.searchParams.get("recursive") === "true";
    const objects = await listObjects(bucket, prefix, { recursive });
    return NextResponse.json({ objects });
  } catch (err) {
    return handleApiError(err);
  }
}

// Upload: accepts multipart/form-data with one or more files, writes each to a temp
// path, then `mc cp`s it into the bucket at the given prefix. Streams are written to
// disk rather than buffered into a single shell string, so this is safe for large files
// and avoids any argv/shell injection risk.
export async function POST(req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      // Folder creation request
      const body = await req.json();
      if (body.action === "create-folder" && typeof body.prefix === "string") {
        await createFolder(bucket, body.prefix);
        return NextResponse.json({ ok: true }, { status: 201 });
      }
      return NextResponse.json({ error: "Unsupported JSON action" }, { status: 400 });
    }

    const formData = await req.formData();
    const prefix = String(formData.get("prefix") ?? "");
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const os = await import("os");
    const fs = await import("fs/promises");
    const path = await import("path");

    const uploaded: string[] = [];
    for (const file of files) {
      const tmpPath = path.join(os.tmpdir(), `upload-${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`);
      const buf = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(tmpPath, buf);
      try {
        const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
        const destKey = cleanPrefix ? `${cleanPrefix}/${file.name}` : file.name;
        await mcRun(["cp", tmpPath, `${MC_ALIAS}/${bucket}/${destKey}`], { timeoutMs: 300_000 });
        uploaded.push(destKey);
      } finally {
        await fs.unlink(tmpPath).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, uploaded }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const key = req.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "key query parameter is required" }, { status: 400 });
    }
    const recursive = req.nextUrl.searchParams.get("recursive") === "true";
    const versionId = req.nextUrl.searchParams.get("versionId") ?? undefined;
    await deleteObject(bucket, key, { recursive, versionId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
