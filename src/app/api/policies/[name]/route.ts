import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { getPolicy, deletePolicy, createPolicy } from "@/lib/mc/iam";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireSession();
    const { name } = await params;
    const policy = await getPolicy(name);
    return NextResponse.json({ policy });
  } catch (err) {
    return handleApiError(err);
  }
}

const UpdatePolicySchema = z.object({
  policyJson: z.string().min(1),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireSession();
    const { name } = await params;
    const body = await req.json();
    const parsed = UpdatePolicySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Provide policyJson" }, { status: 400 });
    }
    try {
      JSON.parse(parsed.data.policyJson); // validate JSON
    } catch {
      return NextResponse.json({ error: "Policy is not valid JSON" }, { status: 400 });
    }
    // mc admin policy create overwrites if the policy already exists
    await createPolicy(name, parsed.data.policyJson);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireSession();
    const { name } = await params;
    await deletePolicy(name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

