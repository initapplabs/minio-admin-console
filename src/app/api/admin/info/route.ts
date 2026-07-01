import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { getServerInfo } from "@/lib/mc/admin";

export async function GET() {
  try {
    await requireSession();
    const info = await getServerInfo();
    return NextResponse.json({ info });
  } catch (err) {
    return handleApiError(err);
  }
}
