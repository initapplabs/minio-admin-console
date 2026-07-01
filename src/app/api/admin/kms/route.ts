import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { getKmsStatus, listKmsKeys, createKmsKey } from "@/lib/mc/admin";

export async function GET() {
  try {
    await requireSession();
    const [status, keys] = await Promise.all([getKmsStatus(), listKmsKeys().catch(() => [])]);
    return NextResponse.json({ status, keys });
  } catch (err) {
    return handleApiError(err);
  }
}

const CreateKeySchema = z.object({ keyId: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = CreateKeySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "keyId is required" }, { status: 400 });
    await createKmsKey(parsed.data.keyId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
