import { NextResponse } from "next/server";
import { getSession } from "./session";
import { McError } from "@/lib/mc/executor";

/** Throws a Response-like error to short-circuit a route handler when unauthenticated. */
export class UnauthorizedError extends Error {}

/** Call at the top of any protected API route. Returns the session or throws 401. */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError("Not authenticated");
  }
  return session;
}

/** Standard error-to-response mapper used by API route catch blocks. */
export function handleApiError(err: unknown, req?: Request): NextResponse {
  const urlInfo = req ? ` [URL: ${req.url}]` : "";

  if (err instanceof UnauthorizedError) {
    console.warn(`[API Auth] Unauthorized access attempt${urlInfo}: ${err.message}`);
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (err instanceof McError) {
    const status = err.code === "CONFIG_MISSING" ? 500 : 400;
    console.error(`[API Error] McError (${status})${urlInfo}: ${err.message}`, {
      code: err.code,
      exitCode: err.exitCode,
      raw: err.raw,
      stack: err.stack,
    });
    return NextResponse.json({ error: err.message, code: err.code }, { status });
  }

  if (err instanceof Error) {
    console.error(`[API Error] Internal Server Error (500)${urlInfo}: ${err.message}`, {
      stack: err.stack,
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  console.error(`[API Error] Unknown Error (500)${urlInfo}:`, err);
  return NextResponse.json({ error: "Unknown error" }, { status: 500 });
}
