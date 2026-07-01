import { mcRun, MC_ALIAS } from "./executor";

export interface ServerInfo {
  mode?: string;
  region?: string;
  deploymentID?: string;
  buckets?: { count: number };
  objects?: { count: number };
  usage?: { size: number };
  servers?: Array<{
    endpoint: string;
    state: string;
    uptime?: number;
    version?: string;
    network?: Record<string, string>;
    drives?: Array<{ path: string; state: string; uuid?: string; totalSpace?: number; usedSpace?: number; availableSpace?: number }>;
  }>;
  pools?: unknown;
}

export async function getServerInfo(): Promise<ServerInfo> {
  const result = await mcRun<any>(["admin", "info", MC_ALIAS]);
  const line = result.lines[0] ?? {};
  return line.info ?? line;
}

export interface StorageTier {
  name: string;
  type: string;
  endpoint?: string;
  bucket?: string;
  prefix?: string;
}

export async function listTiers(): Promise<StorageTier[]> {
  const result = await mcRun<any>(["ilm", "tier", "ls", MC_ALIAS]);
  return result.lines.map((l: any) => ({
    name: l.Name ?? l.name,
    type: l.Type ?? l.type,
    endpoint: l.Endpoint,
    bucket: l.Bucket,
    prefix: l.Prefix,
  }));
}

export async function addTier(opts: {
  type: "s3" | "azure" | "gcs" | "minio";
  name: string;
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  prefix?: string;
  region?: string;
}): Promise<void> {
  await mcRun(["ilm", "tier", "add", opts.type, MC_ALIAS, opts.name, "--endpoint", opts.endpoint, "--access-key", opts.accessKey, "--secret-key", opts.secretKey, "--bucket", opts.bucket, ...(opts.prefix ? ["--prefix", opts.prefix] : []), ...(opts.region ? ["--region", opts.region] : [])]);
}

export async function removeTier(name: string): Promise<void> {
  await mcRun(["ilm", "tier", "rm", MC_ALIAS, name]);
}

export interface KmsKeyStatus {
  keyId: string;
  status: string;
}

export async function getKmsStatus(): Promise<unknown> {
  try {
    const result = await mcRun<any>(["admin", "kms", "key", "status", MC_ALIAS]);
    return result.lines[0] ?? {};
  } catch (err) {
    return { available: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function listKmsKeys(): Promise<KmsKeyStatus[]> {
  try {
    const result = await mcRun<any>(["admin", "kms", "key", "list", MC_ALIAS]);
    return result.lines.map((l: any) => ({ keyId: l.keyId ?? l.KeyID, status: l.status ?? "unknown" }));
  } catch {
    return [];
  }
}

export async function createKmsKey(keyId: string): Promise<void> {
  await mcRun(["admin", "kms", "key", "create", MC_ALIAS, keyId]);
}

export interface HealStatus {
  status?: string;
  itemsScanned?: number;
  itemsHealed?: number;
  bytesScanned?: number;
  bucket?: string;
}

export async function startHeal(bucket?: string): Promise<HealStatus> {
  const target = bucket ? `${MC_ALIAS}/${bucket}` : MC_ALIAS;
  const result = await mcRun<any>(["admin", "heal", "--scan", "normal", target], { timeoutMs: 60_000 });
  const last = result.lines[result.lines.length - 1] ?? {};
  return {
    status: last.status,
    itemsScanned: last.itemsScanned ?? last?.summary?.itemsScanned,
    itemsHealed: last.itemsHealed ?? last?.summary?.itemsHealed,
    bytesScanned: last.bytesScanned,
    bucket,
  };
}

export async function getConfigKeys(): Promise<Record<string, string>[]> {
  const result = await mcRun<any>(["admin", "config", "get", MC_ALIAS], { raw: true });
  // mc admin config get returns plain text "key val=opt val2=opt2" lines, not JSON
  return result.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => ({ raw: line }));
}

export async function getConfigSubsystem(subsystem: string): Promise<string> {
  const result = await mcRun<any>(["admin", "config", "get", MC_ALIAS, subsystem], { raw: true });
  return result.stdout.trim();
}

export async function setConfigSubsystem(kv: string): Promise<{ restartRequired: boolean }> {
  const result = await mcRun<any>(["admin", "config", "set", MC_ALIAS, kv], { raw: true });
  const restartRequired = /restart/i.test(result.stdout);
  return { restartRequired };
}

export async function listEventArns(): Promise<string[]> {
  try {
    const result = await mcRun<any>(["admin", "config", "get", MC_ALIAS, "notify_webhook"], { raw: true });
    return result.stdout.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export async function listConfigSubsystems(): Promise<string[]> {
  const keys = await getConfigKeys();
  return keys
    .map((k) => k.raw.trim().split(/\s+/)[0])
    .filter((name) => name && name !== "KEYS:");
}

export interface BatchJob {
  id: string;
  type: string;
  status?: string;
}

export async function listBatchJobs(): Promise<BatchJob[]> {
  const result = await mcRun<any>(["batch", "list", MC_ALIAS]);
  return result.lines.map((l: any) => ({ id: l.id ?? l.Id, type: l.type ?? l.Type, status: l.status }));
}

export async function describeBatchJob(id: string): Promise<unknown> {
  const result = await mcRun<any>(["batch", "status", MC_ALIAS, id]);
  return result.lines[0] ?? {};
}

export async function getPrometheusMetrics(): Promise<string> {
  const result = await mcRun<any>(["admin", "prometheus", "metrics", MC_ALIAS], { raw: true });
  return result.stdout;
}
