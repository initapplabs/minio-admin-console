"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Badge, DataTag } from "@/components/ui/Card";
import { EmptyState, TableSkeleton } from "@/components/ui/EmptyState";
import { ListChecks } from "lucide-react";

interface BatchJobRow {
  id: string;
  type: string;
  status?: string;
}

export default function BatchJobsPage() {
  const { data, error, isLoading } = useSWR<{ jobs: BatchJobRow[] }>("/api/batch", fetcher, { refreshInterval: 10_000 });
  const jobs = data?.jobs ?? [];

  return (
    <div className="space-y-5">
      <Card>
        {isLoading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : error ? (
          <p className="text-sm text-status-bad p-6">{error.message}</p>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No batch jobs"
            description="Batch jobs for large-scale replicate, expire, or key-rotate operations will appear here once started via mc admin batch."
          />
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_160px_140px] gap-4 px-5 py-2.5 border-b border-border-subtle text-xs font-medium text-text-muted uppercase tracking-wide">
              <span>Job ID</span>
              <span>Type</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-border-subtle">
              {jobs.map((job) => (
                <div key={job.id} className="grid grid-cols-[1fr_160px_140px] gap-4 px-5 py-3.5 items-center hover:bg-bg-raised/50">
                  <DataTag>{job.id}</DataTag>
                  <span className="text-sm text-text-secondary">{job.type}</span>
                  <Badge status={job.status === "Complete" ? "good" : job.status === "Failed" ? "bad" : "neutral"}>
                    {job.status ?? "unknown"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
