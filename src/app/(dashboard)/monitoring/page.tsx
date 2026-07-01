"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiPost, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/EmptyState";
import { Activity, HeartPulse } from "lucide-react";
import { toast } from "sonner";

interface MetricsResponse {
  metrics: string;
}

function parseKeyMetrics(raw: string): Record<string, number> {
  const result: Record<string, number> = {};
  const wanted = [
    "minio_node_disk_used_bytes",
    "minio_node_disk_total_bytes",
    "minio_s3_requests_total",
    "minio_s3_requests_errors_total",
    "minio_s3_traffic_received_bytes",
    "minio_s3_traffic_sent_bytes",
  ];
  for (const line of raw.split("\n")) {
    if (line.startsWith("#") || !line.trim()) continue;
    const [keyPart, valuePart] = line.split(/\s+(?=[\d.+-])/);
    const metricName = keyPart.split("{")[0];
    if (wanted.includes(metricName)) {
      const num = parseFloat(valuePart);
      if (!Number.isNaN(num)) {
        result[metricName] = (result[metricName] ?? 0) + num;
      }
    }
  }
  return result;
}

export default function MonitoringPage() {
  const { data, error, isLoading } = useSWR<MetricsResponse>("/api/admin/metrics", fetcher, { refreshInterval: 10_000 });
  const [healing, setHealing] = useState(false);

  const metrics = data ? parseKeyMetrics(data.metrics) : {};

  const triggerHeal = async () => {
    setHealing(true);
    try {
      await apiPost("/api/admin/heal", {});
      toast.success("Heal scan started across the cluster");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start heal");
    } finally {
      setHealing(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Cluster self-healing</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-text-secondary max-w-md">
            Scans all data for bitrot or corruption and repairs it using erasure-coded parity. Safe to run on a live cluster.
          </p>
          <Button variant="secondary" onClick={triggerHeal} loading={healing}>
            <HeartPulse className="h-4 w-4" />
            Start heal scan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live request metrics</CardTitle>
          <Badge status="neutral">
            <Activity className="h-3 w-3" />
            refreshes every 10s
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-status-bad">{error.message}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Metric label="Total S3 requests" value={metrics["minio_s3_requests_total"]} />
              <Metric label="S3 request errors" value={metrics["minio_s3_requests_errors_total"]} danger />
              <Metric label="Bytes received" value={metrics["minio_s3_traffic_received_bytes"]} bytes />
              <Metric label="Bytes sent" value={metrics["minio_s3_traffic_sent_bytes"]} bytes />
              <Metric label="Disk used" value={metrics["minio_node_disk_used_bytes"]} bytes />
              <Metric label="Disk total" value={metrics["minio_node_disk_total_bytes"]} bytes />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, bytes, danger }: { label: string; value?: number; bytes?: boolean; danger?: boolean }) {
  const formatted =
    value === undefined
      ? "—"
      : bytes
        ? formatBytesLocal(value)
        : new Intl.NumberFormat("en-US").format(value);
  return (
    <div className="rounded-md border border-border-subtle bg-bg-raised p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-lg font-mono font-semibold mt-1 ${danger && value ? "text-status-bad" : "text-text-primary"}`}>
        {formatted}
      </p>
    </div>
  );
}

function formatBytesLocal(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${(bytes / Math.pow(k, idx)).toFixed(1)} ${sizes[idx]}`;
}
