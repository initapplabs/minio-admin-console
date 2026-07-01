import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { listTiers, addTier } from "@/lib/mc/admin";

export async function GET() {
  try {
    await requireSession();
    const tiers = await listTiers();
    return NextResponse.json({ tiers });
  } catch (err) {
    return handleApiError(err);
  }
}

const AddTierSchema = z.object({
  type: z.enum(["s3", "azure", "gcs", "minio"]),
  name: z.string().min(1),
  endpoint: z.string().min(1),
  bucket: z.string().min(1),
  accessKey: z.string().min(1),
  secretKey: z.string().min(1),
  prefix: z.string().optional(),
  region: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = AddTierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    await addTier(parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
