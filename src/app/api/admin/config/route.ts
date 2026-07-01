import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { getConfigSubsystem, setConfigSubsystem } from "@/lib/mc/admin";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const subsystem = req.nextUrl.searchParams.get("subsystem") ?? "";
    const config = await getConfigSubsystem(subsystem);
    return NextResponse.json({ config });
  } catch (err) {
    return handleApiError(err);
  }
}

const SetConfigSchema = z.object({ kv: z.string().min(1) });

export async function PUT(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = SetConfigSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "kv is required, e.g. 'region name=us-east-1'" }, { status: 400 });
    const result = await setConfigSubsystem(parsed.data.kv);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
