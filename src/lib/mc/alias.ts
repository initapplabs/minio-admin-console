import { mcRun, McError, MC_ALIAS, getMinioEnv, ensureAliasConfigured } from "./executor";

/**
 * Configures the `mc` alias pointing at the operator's MinIO cluster using the
 * admin access key / secret key supplied via environment variables. This runs
 * lazily on first use and is idempotent (mc alias set overwrites safely).
 *
 * Required env vars:
 *   MINIO_ENDPOINT      e.g. http://minio:9000 or https://minio.example.com
 *   MINIO_ACCESS_KEY    admin access key
 *   MINIO_SECRET_KEY    admin secret key
 *   MINIO_API_INSECURE  "true" to skip TLS cert verification (self-signed certs), optional
 */

export { getMinioEnv, ensureAliasConfigured };

/** Validates that the configured admin credentials actually work against the live cluster. */
export async function verifyAdminCredentials(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    // We call ensureAliasConfigured() to initialize/verify the alias
    await ensureAliasConfigured();
    await mcRun(["admin", "info", MC_ALIAS], { timeoutMs: 10_000 });
    return { ok: true };
  } catch (err) {
    const message = err instanceof McError ? err.message : "Unable to reach MinIO with the supplied credentials.";
    return { ok: false, message };
  }
}
