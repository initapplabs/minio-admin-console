import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { getPrometheusMetrics } from "@/lib/mc/admin";

export async function GET() {
  try {
    await requireSession();
    const metrics = await getPrometheusMetrics();
    return NextResponse.json({ metrics });
  } catch (err) {
    return handleApiError(err);
  }
}
