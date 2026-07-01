import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { deleteServiceAccount, setServiceAccountStatus } from "@/lib/mc/iam";

const PatchSchema = z.object({ status: z.enum(["on", "off"]) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ accessKey: string }> }) {
  try {
    await requireSession();
    const { accessKey } = await params;
    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "status must be 'on' or 'off'" }, { status: 400 });
    await setServiceAccountStatus(accessKey, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ accessKey: string }> }) {
  try {
    await requireSession();
    const { accessKey } = await params;
    await deleteServiceAccount(accessKey);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
