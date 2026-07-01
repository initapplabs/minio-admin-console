import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { getBucketPolicy, setBucketPolicy, setBucketAnonymousAccess } from "@/lib/mc/buckets";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const policyJson = await getBucketPolicy(bucket);
    return NextResponse.json({ policyJson });
  } catch (err) {
    return handleApiError(err);
  }
}

const SetPolicySchema = z.union([
  z.object({ policyJson: z.string().min(1) }),
  z.object({ anonymousAccess: z.enum(["none", "download", "upload", "public"]) }),
]);

export async function PUT(req: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    await requireSession();
    const { bucket } = await params;
    const body = await req.json();
    const parsed = SetPolicySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Provide either policyJson or anonymousAccess" }, { status: 400 });
    }

    if ("policyJson" in parsed.data) {
      try {
        await setBucketPolicy(bucket, parsed.data.policyJson);
      } catch (e) {
        if (e instanceof SyntaxError) {
          return NextResponse.json({ error: "Policy is not valid JSON" }, { status: 400 });
        }
        throw e;
      }
    } else {
      await setBucketAnonymousAccess(bucket, parsed.data.anonymousAccess);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
