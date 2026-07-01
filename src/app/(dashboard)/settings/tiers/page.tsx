"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTag, Badge } from "@/components/ui/Card";
import { EmptyState, TableSkeleton } from "@/components/ui/EmptyState";
import { AddTierModal } from "@/components/monitoring/AddTierModal";
import { Layers, Plus } from "lucide-react";

interface TierRow {
  name: string;
  type: string;
  endpoint?: string;
  bucket?: string;
}

export default function TiersPage() {
  const { data, error, isLoading, mutate } = useSWR<{ tiers: TierRow[] }>("/api/admin/tiers", fetcher);
  const [createOpen, setCreateOpen] = useState(false);
  const tiers = data?.tiers ?? [];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add tier
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton rows={3} cols={3} />
        ) : error ? (
          <p className="text-sm text-status-bad p-6">{error.message}</p>
        ) : tiers.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No remote tiers configured"
            description="Add a remote tier (S3, Azure, GCS, or MinIO) to use in lifecycle transition rules for cold storage."
          />
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_120px_1fr_1fr] gap-4 px-5 py-2.5 border-b border-border-subtle text-xs font-medium text-text-muted uppercase tracking-wide">
              <span>Name</span>
              <span>Type</span>
              <span>Endpoint</span>
              <span>Bucket</span>
            </div>
            <div className="divide-y divide-border-subtle">
              {tiers.map((tier) => (
                <div key={tier.name} className="grid grid-cols-[1fr_120px_1fr_1fr] gap-4 px-5 py-3.5 items-center hover:bg-bg-raised/50">
                  <DataTag>{tier.name}</DataTag>
                  <Badge status="neutral">{tier.type}</Badge>
                  <span className="text-sm text-text-secondary font-mono truncate">{tier.endpoint ?? "—"}</span>
                  <span className="text-sm text-text-secondary font-mono truncate">{tier.bucket ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <AddTierModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => mutate()} />
    </div>
  );
}
