import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { listUsers, createUser } from "@/lib/mc/iam";

export async function GET() {
  try {
    await requireSession();
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (err) {
    return handleApiError(err);
  }
}

const CreateUserSchema = z.object({
  accessKey: z.string().min(3).max(128),
  secretKey: z.string().min(8, "Secret key must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    await createUser(parsed.data.accessKey, parsed.data.secretKey);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
