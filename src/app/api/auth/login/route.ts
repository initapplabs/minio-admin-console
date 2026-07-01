import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { getMinioEnv } from "@/lib/mc/alias";
import { mcRun, MC_ALIAS } from "@/lib/mc/executor";

const LoginSchema = z.object({
  accessKey: z.string().min(1, "Access key is required"),
  secretKey: z.string().min(1, "Secret key is required"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { accessKey, secretKey } = parsed.data;

  // The console's login credential IS the MinIO admin access/secret key pair.
  // We verify it by checking it matches the server-configured admin credentials
  // (set via MINIO_ACCESS_KEY / MINIO_SECRET_KEY) AND that those credentials
  // actually authenticate successfully against the live MinIO cluster.
  let serverAccessKey: string, serverSecretKey: string, endpoint: string;
  try {
    const env = getMinioEnv();
    serverAccessKey = env.accessKey;
    serverSecretKey = env.secretKey;
    endpoint = env.endpoint;
  } catch {
    return NextResponse.json(
      { error: "Server is not configured with MinIO credentials. Contact your administrator." },
      { status: 500 }
    );
  }

  if (accessKey !== serverAccessKey || secretKey !== serverSecretKey) {
    return NextResponse.json({ error: "Invalid access key or secret key" }, { status: 401 });
  }

  // Confirm the credentials actually work against the live cluster right now.
  try {
    const insecure = process.env.MINIO_API_INSECURE === "true";
    const aliasArgs = ["alias", "set", MC_ALIAS, endpoint, accessKey, secretKey, "--api", "S3v4"];
    if (insecure) aliasArgs.push("--insecure");
    await mcRun(aliasArgs);
    await mcRun(["admin", "info", MC_ALIAS], { timeoutMs: 10_000 });
  } catch (err) {
    console.error("[Login Error] Failed to verify credentials against live cluster:", err);
    return NextResponse.json(
      { error: "Credentials are valid but the MinIO cluster could not be reached. Check server connectivity." },
      { status: 502 }
    );
  }

  await createSession(accessKey);
  return NextResponse.json({ ok: true });
}
