import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { listBuckets, createBucket, getBucketSizeInfo, getBucketVersioning } from "@/lib/mc/buckets";

export async function GET() {
  try {
    await requireSession();
    const buckets = await listBuckets();

    // Enrich with size + versioning in parallel, but don't let one failure break the list.
    const enriched = await Promise.all(
      buckets.map(async (b) => {
        const [sizeInfo, versioning] = await Promise.all([
          getBucketSizeInfo(b.key).catch(() => ({ size: 0, objects: 0 })),
          getBucketVersioning(b.key).catch(() => ({ Status: "Unknown" })),
        ]);
        return {
          ...b,
          size: sizeInfo.size,
          objectsCount: sizeInfo.objects,
          versioning: { status: versioning.Status ?? "Unknown" },
        };
      })
    );

    return NextResponse.json({ buckets: enriched });
  } catch (err) {
    return handleApiError(err);
  }
}

const CreateBucketSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/, "Bucket names must be lowercase alphanumeric, dots, or hyphens"),
  objectLocking: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = CreateBucketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    await createBucket(parsed.data.name, { objectLocking: parsed.data.objectLocking });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
