import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { listGroups, createGroup, getGroup } from "@/lib/mc/iam";

export async function GET() {
  try {
    await requireSession();
    const names = await listGroups();
    const groups = await Promise.all(
      names.map((n) => getGroup(n).catch(() => ({ name: n, status: "enabled" as const, members: [] })))
    );
    return NextResponse.json({ groups });
  } catch (err) {
    return handleApiError(err);
  }
}

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(128),
  members: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = CreateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    await createGroup(parsed.data.name, parsed.data.members);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
