import { mcRun, MC_ALIAS } from "./executor";

export interface ObjectEntry {
  key: string;
  isDir: boolean;
  size: number;
  lastModified?: string;
  etag?: string;
  storageClass?: string;
  versionId?: string;
}

function bucketPath(bucket: string, prefix = ""): string {
  const cleanPrefix = prefix.replace(/^\/+/, "");
  return `${MC_ALIAS}/${bucket}/${cleanPrefix}`;
}

export async function listObjects(bucket: string, prefix = "", opts?: { recursive?: boolean; withVersions?: boolean }): Promise<ObjectEntry[]> {
  const args = ["ls", bucketPath(bucket, prefix)];
  if (opts?.recursive) args.push("--recursive");
  if (opts?.withVersions) args.push("--versions");

  const result = await mcRun<any>(args);
  return result.lines.map((l) => ({
    key: String(l.key ?? ""),
    isDir: l.type === "folder",
    size: l.size ?? 0,
    lastModified: l.lastModified,
    etag: l.etag,
    storageClass: l.storageClass,
    versionId: l.versionId,
  }));
}

export async function deleteObject(bucket: string, key: string, opts?: { versionId?: string; recursive?: boolean }): Promise<void> {
  const args = ["rm", bucketPath(bucket, key)];
  if (opts?.versionId) args.push("--version-id", opts.versionId);
  if (opts?.recursive) args.push("--recursive", "--force");
  await mcRun(args);
}

export async function copyObject(
  bucket: string,
  key: string,
  destBucket: string,
  destKey: string
): Promise<void> {
  await mcRun(["cp", bucketPath(bucket, key), bucketPath(destBucket, destKey)]);
}

export async function statObject(bucket: string, key: string): Promise<Record<string, unknown>> {
  const result = await mcRun<any>(["stat", bucketPath(bucket, key)]);
  return result.lines[0] ?? {};
}

export async function presignObject(bucket: string, key: string, expirySeconds = 3600): Promise<string> {
  const result = await mcRun<any>(["share", "download", bucketPath(bucket, key), "--expire", `${expirySeconds}s`]);
  const line = result.lines[0] as any;
  return line?.share ?? line?.url ?? "";
}

export async function presignUpload(bucket: string, key: string, expirySeconds = 3600): Promise<string> {
  const result = await mcRun<any>(["share", "upload", bucketPath(bucket, key), "--expire", `${expirySeconds}s`]);
  const line = result.lines[0] as any;
  return line?.share ?? line?.url ?? "";
}

export async function getObjectTags(bucket: string, key: string): Promise<Record<string, string>> {
  try {
    const result = await mcRun<any>(["tag", "list", bucketPath(bucket, key)]);
    const line = result.lines[0] as any;
    return line?.tagset ?? {};
  } catch {
    return {};
  }
}

export async function setObjectTags(bucket: string, key: string, tags: Record<string, string>): Promise<void> {
  const tagString = Object.entries(tags)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  await mcRun(["tag", "set", bucketPath(bucket, key), tagString]);
}

export async function setObjectRetention(
  bucket: string,
  key: string,
  opts: { mode: "GOVERNANCE" | "COMPLIANCE"; until: string }
): Promise<void> {
  await mcRun(["retention", "set", opts.mode, opts.until, bucketPath(bucket, key)]);
}

export async function createFolder(bucket: string, prefix: string): Promise<void> {
  // mc has no explicit mkdir for object storage; creating a zero-byte placeholder
  // object with a trailing slash is the conventional approach.
  const os = await import("os");
  const fs = await import("fs/promises");
  const path = await import("path");

  const tmpFile = path.join(os.tmpdir(), `.keep-${Date.now()}`);
  await fs.writeFile(tmpFile, "");
  try {
    const cleanPrefix = prefix.replace(/\/+$/, "");
    await mcRun(["cp", tmpFile, bucketPath(bucket, `${cleanPrefix}/.keep`)]);
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}
