import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { attachUserPolicy, detachUserPolicy } from "@/lib/mc/iam";

const PolicySchema = z.object({ policyName: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireSession();
    const { name } = await params;
    const body = await req.json();
    const parsed = PolicySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "policyName is required" }, { status: 400 });
    await attachUserPolicy(name, parsed.data.policyName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireSession();
    const { name } = await params;
    const policyName = req.nextUrl.searchParams.get("policyName");
    if (!policyName) return NextResponse.json({ error: "policyName query parameter is required" }, { status: 400 });
    await detachUserPolicy(name, policyName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
