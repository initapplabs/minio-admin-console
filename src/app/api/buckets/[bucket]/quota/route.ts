import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { getBucketQuota, setBucketQuota, clearBucketQuota } from "@/lib/mc/buckets";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const quota = await getBucketQuota(bucket);
    return NextResponse.json({ quota });
  } catch (err) {
    return handleApiError(err);
  }
}

const SetQuotaSchema = z.object({ bytes: z.number().int().positive() });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const body = await req.json();
    const parsed = SetQuotaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "bytes must be a positive integer" }, { status: 400 });
    }
    await setBucketQuota(bucket, parsed.data.bytes);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    await clearBucketQuota(bucket);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
