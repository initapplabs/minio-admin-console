"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiPatch, apiDelete, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, DataTag } from "@/components/ui/Card";
import { EmptyState, TableSkeleton } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreateServiceAccountModal } from "@/components/identity/CreateServiceAccountModal";
import { KeyRound, Plus, Trash2, Power } from "lucide-react";
import { toast } from "sonner";

interface ServiceAccountRow {
  accessKey: string;
  parentUser: string;
  status: "on" | "off";
  name?: string;
}

export default function ServiceAccountsPage() {
  const { data, error, isLoading, mutate } = useSWR<{ accounts: ServiceAccountRow[] }>("/api/service-accounts", fetcher);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const toggleStatus = async (account: ServiceAccountRow) => {
    try {
      await apiPatch(`/api/service-accounts/${encodeURIComponent(account.accessKey)}`, {
        status: account.status === "on" ? "off" : "on",
      });
      toast.success(`Service account ${account.status === "on" ? "disabled" : "enabled"}`);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update service account");
    }
  };

  const handleDelete = async (accessKey: string) => {
    try {
      await apiDelete(`/api/service-accounts/${encodeURIComponent(accessKey)}`);
      toast.success("Service account deleted");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete service account");
    }
  };

  const accounts = data?.accounts ?? [];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create service account
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : error ? (
          <p className="text-sm text-status-bad p-6">{error.message}</p>
        ) : accounts.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No service accounts yet"
            description="Service accounts provide programmatic access keys scoped to a parent user, ideal for applications and CI pipelines."
          />
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_160px_140px_120px] gap-4 px-5 py-2.5 border-b border-border-subtle text-xs font-medium text-text-muted uppercase tracking-wide">
              <span>Access key</span>
              <span>Parent user</span>
              <span>Status</span>
              <span />
            </div>
            <div className="divide-y divide-border-subtle">
              {accounts.map((account) => (
                <div key={account.accessKey} className="grid grid-cols-[1fr_160px_140px_120px] gap-4 px-5 py-3.5 items-center hover:bg-bg-raised/50">
                  <div>
                    <DataTag>{account.accessKey}</DataTag>
                    {account.name && <p className="text-xs text-text-muted mt-1">{account.name}</p>}
                  </div>
                  <span className="text-sm text-text-secondary font-mono truncate">{account.parentUser}</span>
                  <Badge status={account.status === "on" ? "good" : "neutral"}>{account.status === "on" ? "active" : "disabled"}</Badge>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleStatus(account)} aria-label="Toggle status">
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(account.accessKey)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-status-bad" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <CreateServiceAccountModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => mutate()} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
        title="Delete service account"
        description="Any applications using this access key will immediately lose access."
        confirmLabel="Delete"
      />
    </div>
  );
}
