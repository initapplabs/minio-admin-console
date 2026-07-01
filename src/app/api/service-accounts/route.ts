import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { listServiceAccounts, createServiceAccount } from "@/lib/mc/iam";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const parentUser = req.nextUrl.searchParams.get("parentUser") ?? session.sub;
    const accounts = await listServiceAccounts(parentUser);
    return NextResponse.json({ accounts });
  } catch (err) {
    return handleApiError(err);
  }
}

const CreateSchema = z.object({
  parentUser: z.string().min(1),
  accessKey: z.string().optional(),
  secretKey: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  expiry: z.string().optional(),
  policyJson: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const credentials = await createServiceAccount(parsed.data);
    return NextResponse.json({ ok: true, ...credentials }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
