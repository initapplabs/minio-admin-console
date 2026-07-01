import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import {
  getGroup,
  deleteGroup,
  setGroupStatus,
  addGroupMembers,
  removeGroupMembers,
  attachGroupPolicy,
  detachGroupPolicy,
} from "@/lib/mc/iam";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireSession();
    const { name } = await params;
    const group = await getGroup(name);
    return NextResponse.json({ group });
  } catch (err) {
    return handleApiError(err);
  }
}

const PatchSchema = z.union([
  z.object({ status: z.enum(["enable", "disable"]) }),
  z.object({ addMembers: z.array(z.string()) }),
  z.object({ removeMembers: z.array(z.string()) }),
  z.object({ attachPolicy: z.string() }),
  z.object({ detachPolicy: z.string() }),
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireSession();
    const { name } = await params;
    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const data = parsed.data;
    if ("status" in data) await setGroupStatus(name, data.status);
    else if ("addMembers" in data) await addGroupMembers(name, data.addMembers);
    else if ("removeMembers" in data) await removeGroupMembers(name, data.removeMembers);
    else if ("attachPolicy" in data) await attachGroupPolicy(name, data.attachPolicy);
    else if ("detachPolicy" in data) await detachGroupPolicy(name, data.detachPolicy);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireSession();
    const { name } = await params;
    await deleteGroup(name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
