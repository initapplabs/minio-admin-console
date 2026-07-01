import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { getBucketEncryption, setBucketEncryption, clearBucketEncryption } from "@/lib/mc/buckets";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const encryption = await getBucketEncryption(bucket);
    return NextResponse.json({ encryption });
  } catch (err) {
    return handleApiError(err);
  }
}

const SetEncryptionSchema = z.object({
  algorithm: z.enum(["sse-s3", "sse-kms"]),
  kmsKeyId: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const body = await req.json();
    const parsed = SetEncryptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    await setBucketEncryption(bucket, parsed.data.algorithm, parsed.data.kmsKeyId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    await clearBucketEncryption(bucket);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
