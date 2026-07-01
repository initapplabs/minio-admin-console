"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { fetcher, apiDelete, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge, DataTag } from "@/components/ui/Card";
import { EmptyState, TableSkeleton } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreateBucketModal } from "@/components/buckets/CreateBucketModal";
import { formatBytes, formatNumber } from "@/lib/utils";
import { Boxes, Plus, Search, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface BucketRow {
  key: string;
  size: number;
  objectsCount?: number;
  versioning: { status: string };
}

export default function BucketsPage() {
  const { data, error, isLoading, mutate } = useSWR<{ buckets: BucketRow[] }>("/api/buckets", fetcher);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const buckets = data?.buckets ?? [];
    if (!query) return buckets;
    return buckets.filter((b) => b.key.includes(query.toLowerCase()));
  }, [data, query]);

  const handleDelete = async (bucket: string) => {
    try {
      await apiDelete(`/api/buckets/${encodeURIComponent(bucket)}`);
      toast.success(`Bucket "${bucket}" deleted`);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete bucket");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <Input
            placeholder="Search buckets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create bucket
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : error ? (
          <div className="p-6">
            <p className="text-sm text-status-bad">Failed to load buckets: {error.message}</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={query ? "No buckets match your search" : "No buckets yet"}
            description={
              query
                ? "Try a different search term."
                : "Create your first bucket to start storing objects."
            }
            action={
              !query && (
                <Button variant="primary" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create bucket
                </Button>
              )
            }
          />
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_140px_120px_140px_40px] gap-4 px-5 py-2.5 border-b border-border-subtle text-xs font-medium text-text-muted uppercase tracking-wide">
              <span>Name</span>
              <span>Objects</span>
              <span>Size</span>
              <span>Versioning</span>
              <span />
            </div>
            <div className="divide-y divide-border-subtle">
              {filtered.map((bucket) => (
                <div
                  key={bucket.key}
                  className="grid grid-cols-[1fr_140px_120px_140px_40px] gap-4 px-5 py-3.5 items-center hover:bg-bg-raised/50 transition-colors group"
                >
                  <Link href={`/buckets/${encodeURIComponent(bucket.key)}`} className="flex items-center gap-2.5 min-w-0">
                    <Boxes className="h-4 w-4 text-text-muted shrink-0" />
                    <DataTag className="truncate">{bucket.key}</DataTag>
                  </Link>
                  <span className="text-sm text-text-secondary font-mono">{formatNumber(bucket.objectsCount ?? 0)}</span>
                  <span className="text-sm text-text-secondary font-mono">{formatBytes(bucket.size)}</span>
                  <Badge status={bucket.versioning.status === "Enabled" ? "good" : "neutral"}>
                    {bucket.versioning.status === "Enabled" && <ShieldCheck className="h-3 w-3" />}
                    {bucket.versioning.status}
                  </Badge>
                  <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(bucket.key)} aria-label={`Delete ${bucket.key}`}>
                      <Trash2 className="h-3.5 w-3.5 text-status-bad" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <CreateBucketModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => mutate()} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
        title="Delete bucket"
        description={`This permanently deletes "${deleteTarget}" and all objects inside it. This cannot be undone.`}
        confirmLabel="Delete bucket"
        requireTypedConfirmation={deleteTarget ?? undefined}
      />
    </div>
  );
}
