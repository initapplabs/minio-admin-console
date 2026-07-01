import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { listPolicies, createPolicy } from "@/lib/mc/iam";

export async function GET() {
  try {
    await requireSession();
    const policies = await listPolicies();
    return NextResponse.json({ policies });
  } catch (err) {
    return handleApiError(err);
  }
}

const CreatePolicySchema = z.object({
  name: z.string().min(1).max(128),
  policyJson: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = CreatePolicySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    try {
      await createPolicy(parsed.data.name, parsed.data.policyJson);
    } catch (e) {
      if (e instanceof SyntaxError) {
        return NextResponse.json({ error: "Policy is not valid JSON" }, { status: 400 });
      }
      throw e;
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
