import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { listConfigSubsystems } from "@/lib/mc/admin";

export async function GET() {
  try {
    await requireSession();
    const subsystems = await listConfigSubsystems();
    return NextResponse.json({ subsystems });
  } catch (err) {
    return handleApiError(err);
  }
}
