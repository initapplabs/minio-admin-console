import { mcRun, MC_ALIAS } from "./executor";

export interface IamUser {
  accessKey: string;
  status: "enabled" | "disabled";
  policyName?: string;
  memberOf?: string[];
}

export interface IamGroup {
  name: string;
  status: "enabled" | "disabled";
  members: string[];
  policyName?: string;
}

export interface IamPolicy {
  name: string;
  policy?: unknown;
}

export interface ServiceAccount {
  accessKey: string;
  parentUser: string;
  status: "on" | "off";
  expiration?: string;
  name?: string;
  description?: string;
}

// ---------- Users ----------

export async function listUsers(): Promise<IamUser[]> {
  const result = await mcRun<any>(["admin", "user", "list", MC_ALIAS]);
  return result.lines.map((l) => ({
    accessKey: l.accessKey,
    status: l.userStatus === "disabled" ? "disabled" : "enabled",
    policyName: l.policyName,
  }));
}

export async function getUser(accessKey: string): Promise<IamUser> {
  const result = await mcRun<any>(["admin", "user", "info", MC_ALIAS, accessKey]);
  const l = result.lines[0] ?? {};
  return {
    accessKey: l.accessKey ?? accessKey,
    status: l.userStatus === "disabled" ? "disabled" : "enabled",
    policyName: l.policyName,
    memberOf: l.memberOf ?? [],
  };
}

export async function createUser(accessKey: string, secretKey: string): Promise<void> {
  await mcRun(["admin", "user", "add", MC_ALIAS, accessKey, secretKey]);
}

export async function deleteUser(accessKey: string): Promise<void> {
  await mcRun(["admin", "user", "remove", MC_ALIAS, accessKey]);
}

export async function setUserStatus(accessKey: string, status: "enable" | "disable"): Promise<void> {
  await mcRun(["admin", "user", status, MC_ALIAS, accessKey]);
}

export async function attachUserPolicy(accessKey: string, policyName: string): Promise<void> {
  await mcRun(["admin", "policy", "attach", MC_ALIAS, policyName, "--user", accessKey]);
}

export async function detachUserPolicy(accessKey: string, policyName: string): Promise<void> {
  await mcRun(["admin", "policy", "detach", MC_ALIAS, policyName, "--user", accessKey]);
}

// ---------- Groups ----------

export async function listGroups(): Promise<string[]> {
  const result = await mcRun<any>(["admin", "group", "list", MC_ALIAS]);
  // mc admin group list --json returns { groups: [...] } in a single line typically
  const line = result.lines[0] as any;
  if (line?.groups) return line.groups;
  return result.lines.map((l: any) => l.group).filter(Boolean);
}

export async function getGroup(name: string): Promise<IamGroup> {
  const result = await mcRun<any>(["admin", "group", "info", MC_ALIAS, name]);
  const l = result.lines[0] ?? {};
  return {
    name: l.groupName ?? name,
    status: l.groupStatus === "disabled" ? "disabled" : "enabled",
    members: l.members ?? [],
    policyName: l.policyName,
  };
}

export async function createGroup(name: string, members: string[]): Promise<void> {
  await mcRun(["admin", "group", "add", MC_ALIAS, name, ...members]);
}

export async function addGroupMembers(name: string, members: string[]): Promise<void> {
  await mcRun(["admin", "group", "add", MC_ALIAS, name, ...members]);
}

export async function removeGroupMembers(name: string, members: string[]): Promise<void> {
  await mcRun(["admin", "group", "remove", MC_ALIAS, name, ...members]);
}

export async function deleteGroup(name: string): Promise<void> {
  await mcRun(["admin", "group", "remove", MC_ALIAS, name, "--force"]);
}

export async function setGroupStatus(name: string, status: "enable" | "disable"): Promise<void> {
  await mcRun(["admin", "group", status, MC_ALIAS, name]);
}

export async function attachGroupPolicy(name: string, policyName: string): Promise<void> {
  await mcRun(["admin", "policy", "attach", MC_ALIAS, policyName, "--group", name]);
}

export async function detachGroupPolicy(name: string, policyName: string): Promise<void> {
  await mcRun(["admin", "policy", "detach", MC_ALIAS, policyName, "--group", name]);
}

// ---------- Policies ----------

export async function listPolicies(): Promise<IamPolicy[]> {
  const result = await mcRun<any>(["admin", "policy", "list", MC_ALIAS]);
  const line = result.lines[0] as any;
  if (line && typeof line.policy === "object" && line.policy !== null) {
    return Object.keys(line.policy).map((name) => ({ name }));
  }
  return result.lines
    .map((l: any) => ({
      name: typeof l.policy === "string" ? l.policy : (l.name ?? "")
    }))
    .filter((p) => p.name);
}

export async function getPolicy(name: string): Promise<IamPolicy> {
  const result = await mcRun<any>(["admin", "policy", "info", MC_ALIAS, name]);
  const l = result.lines[0] ?? {};
  return { name: l.policy ?? name, policy: l.policyJSON ? JSON.parse(l.policyJSON) : l };
}

export async function createPolicy(name: string, policyJson: string): Promise<void> {
  JSON.parse(policyJson); // validate

  const os = await import("os");
  const fs = await import("fs/promises");
  const path = await import("path");

  const tmpFile = path.join(os.tmpdir(), `iam-policy-${name}-${Date.now()}.json`);
  await fs.writeFile(tmpFile, policyJson, "utf8");
  try {
    await mcRun(["admin", "policy", "create", MC_ALIAS, name, tmpFile]);
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}

export async function deletePolicy(name: string): Promise<void> {
  await mcRun(["admin", "policy", "remove", MC_ALIAS, name]);
}

// ---------- Service Accounts ----------

export async function listServiceAccounts(parentUser?: string): Promise<ServiceAccount[]> {
  const targetUser = parentUser || process.env.MINIO_ACCESS_KEY || "";
  const args: string[] = ["admin", "user", "svcacct", "list", MC_ALIAS];
  if (targetUser) args.push(targetUser);
  const result = await mcRun<any>(args);
  return result.lines.map((l) => ({
    accessKey: l.accessKey,
    parentUser: l.parentUser ?? targetUser ?? "",
    status: l.accountStatus === "off" ? "off" : "on",
    expiration: l.expiration,
    name: l.name,
    description: l.description,
  }));
}

export async function createServiceAccount(opts: {
  parentUser: string;
  accessKey?: string;
  secretKey?: string;
  name?: string;
  description?: string;
  expiry?: string;
  policyJson?: string;
}): Promise<{ accessKey: string; secretKey: string }> {
  const args: string[] = ["admin", "user", "svcacct", "add", MC_ALIAS, opts.parentUser];
  if (opts.accessKey) args.push("--access-key", opts.accessKey);
  if (opts.secretKey) args.push("--secret-key", opts.secretKey);
  if (opts.name) args.push("--name", opts.name);
  if (opts.description) args.push("--description", opts.description);
  if (opts.expiry) args.push("--expiry", opts.expiry);

  let tmpFile: string | undefined;
  if (opts.policyJson) {
    JSON.parse(opts.policyJson);
    const os = await import("os");
    const fs = await import("fs/promises");
    const path = await import("path");
    tmpFile = path.join(os.tmpdir(), `svcacct-policy-${Date.now()}.json`);
    await fs.writeFile(tmpFile, opts.policyJson, "utf8");
    args.push("--policy", tmpFile);
  }

  try {
    const result = await mcRun<any>(args);
    const l = result.lines[0] as any;
    return { accessKey: l.accessKey, secretKey: l.secretKey };
  } finally {
    if (tmpFile) {
      const fs = await import("fs/promises");
      await fs.unlink(tmpFile).catch(() => {});
    }
  }
}

export async function deleteServiceAccount(accessKey: string): Promise<void> {
  await mcRun(["admin", "user", "svcacct", "remove", MC_ALIAS, accessKey]);
}

export async function setServiceAccountStatus(accessKey: string, status: "on" | "off"): Promise<void> {
  await mcRun(["admin", "user", "svcacct", "edit", MC_ALIAS, accessKey, "--status", status]);
}
