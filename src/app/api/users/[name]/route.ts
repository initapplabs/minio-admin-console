import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { getUser, deleteUser, setUserStatus } from "@/lib/mc/iam";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireSession();
    const { name } = await params;
    const user = await getUser(name);
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}

const PatchSchema = z.object({ status: z.enum(["enable", "disable"]) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireSession();
    const { name } = await params;
    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "status must be 'enable' or 'disable'" }, { status: 400 });
    }
    await setUserStatus(name, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireSession();
    const { name } = await params;
    await deleteUser(name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
