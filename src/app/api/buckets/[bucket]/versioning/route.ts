import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { getBucketVersioning, setBucketVersioning } from "@/lib/mc/buckets";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const versioning = await getBucketVersioning(bucket);
    return NextResponse.json({ versioning });
  } catch (err) {
    return handleApiError(err);
  }
}

const SetVersioningSchema = z.object({ enabled: z.boolean() });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const body = await req.json();
    const parsed = SetVersioningSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }
    await setBucketVersioning(bucket, parsed.data.enabled);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
