import { mcRun, MC_ALIAS, McError } from "./executor";

export interface BucketSummary {
  key: string;
  url: string;
  versioning: { status: string; mfaDelete?: string };
  size: number;
  objectsCount?: number;
  lastModified?: string;
}

export interface BucketDetail extends BucketSummary {
  quota?: { quota: number; type: string } | null;
  encryption?: { algorithm: string } | null;
  policyJson?: string | null;
  lifecycle?: unknown;
  replication?: unknown;
  versioningInfo?: { Status?: string; MFADelete?: string };
  tags?: Record<string, string>;
}

/** List all buckets with summary stats. */
export async function listBuckets(): Promise<BucketSummary[]> {
  const result = await mcRun<any>(["ls", `${MC_ALIAS}/`]);
  return result.lines
    .filter((l) => l.type === "folder" || l.key)
    .map((l) => ({
      key: String(l.key ?? "").replace(/\/$/, ""),
      url: l.url ?? "",
      versioning: { status: "Unknown" },
      size: l.size ?? 0,
      lastModified: l.lastModified,
    }));
}

export async function createBucket(name: string, opts?: { objectLocking?: boolean }): Promise<void> {
  const args = ["mb", `${MC_ALIAS}/${name}`];
  if (opts?.objectLocking) args.push("--with-lock");
  await mcRun(args);
}

export async function deleteBucket(name: string, opts?: { force?: boolean }): Promise<void> {
  const args = ["rb", `${MC_ALIAS}/${name}`];
  if (opts?.force) args.push("--force");
  await mcRun(args);
}

export async function getBucketVersioning(name: string): Promise<{ Status?: string; MFADelete?: string }> {
  const result = await mcRun<any>(["version", "info", `${MC_ALIAS}/${name}`]);
  const line = result.lines[0] ?? {};
  return { Status: line.status, MFADelete: line.MFADelete };
}

export async function setBucketVersioning(name: string, enabled: boolean): Promise<void> {
  await mcRun(["version", enabled ? "enable" : "suspend", `${MC_ALIAS}/${name}`]);
}

export async function getBucketPolicy(name: string): Promise<string | null> {
  try {
    const result = await mcRun<any>(["anonymous", "get-json", `${MC_ALIAS}/${name}`]);
    const line = result.lines[0];
    return line?.policy ? JSON.stringify(line.policy, null, 2) : null;
  } catch {
    return null;
  }
}

export async function setBucketPolicy(name: string, policyJson: string): Promise<void> {
  // Validate JSON before writing to a temp-less stdin approach: mc set-json wants a file path.
  // We pipe via a temp file because `mc anonymous set-json` requires a filesystem path argument.
  const os = await import("os");
  const fs = await import("fs/promises");
  const path = await import("path");

  JSON.parse(policyJson); // throws if invalid, caught by route handler

  const tmpFile = path.join(os.tmpdir(), `policy-${name}-${Date.now()}.json`);
  await fs.writeFile(tmpFile, policyJson, "utf8");
  try {
    await mcRun(["anonymous", "set-json", tmpFile, `${MC_ALIAS}/${name}`]);
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}

export async function setBucketAnonymousAccess(
  name: string,
  mode: "none" | "download" | "upload" | "public"
): Promise<void> {
  await mcRun(["anonymous", "set", mode, `${MC_ALIAS}/${name}`]);
}

export async function getBucketQuota(name: string): Promise<{ quota: number; type: string } | null> {
  try {
    const result = await mcRun<any>(["quota", "info", `${MC_ALIAS}/${name}`]);
    const line = result.lines[0];
    if (!line || !line.quota) return null;
    return { quota: line.quota, type: line.type ?? "hard" };
  } catch {
    return null;
  }
}

export async function setBucketQuota(name: string, bytes: number): Promise<void> {
  await mcRun(["quota", "set", `${MC_ALIAS}/${name}`, "--size", `${bytes}`]);
}

export async function clearBucketQuota(name: string): Promise<void> {
  await mcRun(["quota", "clear", `${MC_ALIAS}/${name}`]);
}

export async function getBucketLifecycle(name: string): Promise<unknown> {
  try {
    const result = await mcRun<any>(["ilm", "rule", "ls", `${MC_ALIAS}/${name}`]);
    return result.lines;
  } catch {
    return [];
  }
}

export async function addLifecycleRule(
  name: string,
  rule: { prefix?: string; expireDays?: number; transitionDays?: number; transitionTier?: string; noncurrentExpireDays?: number }
): Promise<void> {
  const args = ["ilm", "rule", "add", `${MC_ALIAS}/${name}`];
  if (rule.prefix) args.push("--prefix", rule.prefix);
  if (rule.expireDays) args.push("--expire-days", `${rule.expireDays}`);
  if (rule.transitionDays && rule.transitionTier) {
    args.push("--transition-days", `${rule.transitionDays}`, "--transition-tier", rule.transitionTier);
  }
  if (rule.noncurrentExpireDays) {
    args.push("--noncurrentversion-expire-days", `${rule.noncurrentExpireDays}`);
  }
  await mcRun(args);
}

export async function removeLifecycleRule(name: string, ruleId: string): Promise<void> {
  await mcRun(["ilm", "rule", "remove", `${MC_ALIAS}/${name}`, "--id", ruleId]);
}

export async function getBucketEncryption(name: string): Promise<{ algorithm: string } | null> {
  try {
    const result = await mcRun<any>(["encrypt", "info", `${MC_ALIAS}/${name}`]);
    const line = result.lines[0];
    return line?.encryptionAlgorithm ? { algorithm: line.encryptionAlgorithm } : null;
  } catch {
    return null;
  }
}

export async function setBucketEncryption(name: string, algorithm: "sse-s3" | "sse-kms", kmsKeyId?: string): Promise<void> {
  const args = ["encrypt", "set", algorithm, `${MC_ALIAS}/${name}`];
  if (algorithm === "sse-kms" && kmsKeyId) args.push(kmsKeyId);
  await mcRun(args);
}

export async function clearBucketEncryption(name: string): Promise<void> {
  await mcRun(["encrypt", "clear", `${MC_ALIAS}/${name}`]);
}

export async function getReplicationStatus(name: string): Promise<unknown> {
  try {
    const result = await mcRun<any>(["replicate", "ls", `${MC_ALIAS}/${name}`]);
    return result.lines;
  } catch {
    return [];
  }
}

export async function addReplicationRule(opts: {
  bucket: string;
  targetArn: string;
  priority?: number;
}): Promise<void> {
  const args = [
    "replicate",
    "add",
    `${MC_ALIAS}/${opts.bucket}`,
    "--remote-bucket",
    opts.targetArn,
  ];
  if (opts.priority) args.push("--priority", `${opts.priority}`);
  await mcRun(args);
}

export async function getBucketSizeInfo(name: string): Promise<{ size: number; objects: number }> {
  const result = await mcRun<any>(["du", `${MC_ALIAS}/${name}`]);
  const line = result.lines[0] ?? {};
  return { size: line.size ?? 0, objects: line.objects ?? 0 };
}
