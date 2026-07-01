import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { startHeal } from "@/lib/mc/admin";

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json().catch(() => ({}));
    const bucket = typeof body.bucket === "string" ? body.bucket : undefined;
    const status = await startHeal(bucket);
    return NextResponse.json({ status });
  } catch (err) {
    return handleApiError(err);
  }
}
