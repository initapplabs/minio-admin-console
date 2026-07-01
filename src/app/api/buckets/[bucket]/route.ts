import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import {
  deleteBucket,
  getBucketVersioning,
  getBucketPolicy,
  getBucketQuota,
  getBucketEncryption,
  getBucketSizeInfo,
} from "@/lib/mc/buckets";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;

    const [versioning, policyJson, quota, encryption, sizeInfo] = await Promise.all([
      getBucketVersioning(bucket).catch(() => ({ Status: "Unknown" })),
      getBucketPolicy(bucket).catch(() => null),
      getBucketQuota(bucket).catch(() => null),
      getBucketEncryption(bucket).catch(() => null),
      getBucketSizeInfo(bucket).catch(() => ({ size: 0, objects: 0 })),
    ]);

    return NextResponse.json({
      key: bucket,
      versioning,
      policyJson,
      quota,
      encryption,
      size: sizeInfo.size,
      objectsCount: sizeInfo.objects,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const force = req.nextUrl.searchParams.get("force") === "true";
    await deleteBucket(bucket, { force });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
