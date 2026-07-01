"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent, StatusDot, Badge } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/EmptyState";
import { formatBytes, formatNumber } from "@/lib/utils";
import { HardDrive, Boxes, FileStack, Database, Server } from "lucide-react";

interface ServerEntry {
  endpoint: string;
  state: string;
  uptime?: number;
  version?: string;
  drives?: Array<{ path: string; state: string; totalSpace?: number; usedSpace?: number; availableSpace?: number }>;
}

interface ServerInfoResponse {
  info: {
    mode?: string;
    region?: string;
    deploymentID?: string;
    buckets?: { count: number };
    objects?: { count: number };
    usage?: { size: number };
    servers?: ServerEntry[];
  };
}

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Boxes; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-muted font-medium">{label}</p>
          <p className="text-2xl font-semibold text-text-primary mt-1.5 font-mono">{value}</p>
          {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
        </div>
        <div className="rounded-md bg-bg-raised p-2">
          <Icon className="h-4 w-4 text-text-secondary" />
        </div>
      </CardContent>
    </Card>
  );
}

function uptimeToHuman(seconds?: number): string {
  if (!seconds) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function OverviewPage() {
  const { data, error, isLoading } = useSWR<ServerInfoResponse>("/api/admin/info", fetcher, {
    refreshInterval: 10_000,
  });

  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-status-bad">Could not reach the MinIO cluster: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const info = data?.info;
  const servers = info?.servers ?? [];
  const totalDrives = servers.reduce((acc, s) => acc + (s.drives?.length ?? 0), 0);
  const onlineDrives = servers.reduce((acc, s) => acc + (s.drives?.filter((d) => d.state === "ok").length ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)
        ) : (
          <>
            <StatCard icon={Boxes} label="Buckets" value={formatNumber(info?.buckets?.count ?? 0)} />
            <StatCard icon={FileStack} label="Objects" value={formatNumber(info?.objects?.count ?? 0)} />
            <StatCard icon={Database} label="Total usage" value={formatBytes(info?.usage?.size ?? 0)} />
            <StatCard
              icon={HardDrive}
              label="Drives online"
              value={`${onlineDrives}/${totalDrives}`}
              sub={totalDrives - onlineDrives > 0 ? `${totalDrives - onlineDrives} need attention` : "all healthy"}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Server nodes</CardTitle>
          <Badge status="neutral">{info?.mode ?? "—"}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5">
              <Skeleton className="h-24" />
            </div>
          ) : servers.length === 0 ? (
            <p className="text-sm text-text-muted px-5 py-6">No server information available.</p>
          ) : (
            <div className="divide-y divide-border-subtle">
              {servers.map((s) => (
                <div key={s.endpoint} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Server className="h-4 w-4 text-text-muted" />
                    <div>
                      <p className="text-sm font-mono text-text-primary">{s.endpoint}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {s.version ? `v${s.version}` : ""} {s.uptime ? `· up ${uptimeToHuman(s.uptime)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.drives && (
                      <span className="text-xs text-text-muted font-mono">
                        {s.drives.filter((d) => d.state === "ok").length}/{s.drives.length} drives
                      </span>
                    )}
                    <Badge status={s.state === "online" ? "good" : "bad"}>
                      <StatusDot status={s.state === "online" ? "good" : "bad"} />
                      {s.state}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {info?.deploymentID && (
        <p className="text-xs text-text-muted font-mono">deployment: {info.deploymentID}</p>
      )}
    </div>
  );
}
