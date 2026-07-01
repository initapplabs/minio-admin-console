import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { listBatchJobs } from "@/lib/mc/admin";

export async function GET() {
  try {
    await requireSession();
    const jobs = await listBatchJobs();
    return NextResponse.json({ jobs });
  } catch (err) {
    return handleApiError(err);
  }
}
