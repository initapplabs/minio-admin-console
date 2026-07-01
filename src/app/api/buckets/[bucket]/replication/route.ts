import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { getReplicationStatus, addReplicationRule } from "@/lib/mc/buckets";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const rules = await getReplicationStatus(bucket);
    return NextResponse.json({ rules });
  } catch (err) {
    return handleApiError(err);
  }
}

const AddReplicationSchema = z.object({
  targetArn: z.string().min(1),
  priority: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const body = await req.json();
    const parsed = AddReplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    await addReplicationRule({ bucket, ...parsed.data });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
