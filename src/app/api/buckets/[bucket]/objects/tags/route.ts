import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { getObjectTags, setObjectTags } from "@/lib/mc/objects";

export async function GET(req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const key = req.nextUrl.searchParams.get("key");
    if (!key) return NextResponse.json({ error: "key query parameter is required" }, { status: 400 });
    const tags = await getObjectTags(bucket, key);
    return NextResponse.json({ tags });
  } catch (err) {
    return handleApiError(err);
  }
}

const SetTagsSchema = z.object({ key: z.string().min(1), tags: z.record(z.string(), z.string()) });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const body = await req.json();
    const parsed = SetTagsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    await setObjectTags(bucket, parsed.data.key, parsed.data.tags);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
