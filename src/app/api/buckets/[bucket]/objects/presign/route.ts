import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { presignObject, presignUpload } from "@/lib/mc/objects";

const PresignSchema = z.object({
  key: z.string().min(1),
  expirySeconds: z.number().int().min(60).max(604800).default(3600),
  mode: z.enum(["download", "upload"]).default("download"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const body = await req.json();
    const parsed = PresignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { key, expirySeconds, mode } = parsed.data;
    const url = mode === "download" ? await presignObject(bucket, key, expirySeconds) : await presignUpload(bucket, key, expirySeconds);
    return NextResponse.json({ url });
  } catch (err) {
    return handleApiError(err);
  }
}
