"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiDelete, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTag } from "@/components/ui/Card";
import { EmptyState, TableSkeleton } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreatePolicyModal } from "@/components/identity/CreatePolicyModal";
import { EditPolicyModal } from "@/components/identity/EditPolicyModal";
import { ShieldCheck, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface PolicyRow {
  name: string;
}

export default function PoliciesPage() {
  const { data, error, isLoading, mutate } = useSWR<{ policies: PolicyRow[] }>("/api/policies", fetcher);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDelete = async (name: string) => {
    try {
      await apiDelete(`/api/policies/${encodeURIComponent(name)}`);
      toast.success(`Policy "${name}" deleted`);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete policy");
    }
  };

  const policies = data?.policies ?? [];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create policy
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton rows={5} cols={3} />
        ) : error ? (
          <p className="text-sm text-status-bad p-6">{error.message}</p>
        ) : policies.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No custom policies yet"
            description="Create reusable IAM policies to attach to users and groups."
          />
        ) : (
          <>
            {/* Table header */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-subtle">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Policy name
              </span>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider w-24 text-right">
                Actions
              </span>
            </div>

            <div className="divide-y divide-border-subtle">
              {policies.map((policy) => (
                <div
                  key={policy.name}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-bg-raised/50 group"
                >
                  {/* Policy name — click to open editor */}
                  <button
                    className="flex items-center gap-2 text-left min-w-0"
                    onClick={() => setEditTarget(policy.name)}
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0 text-text-muted group-hover:text-accent transition-colors" />
                    <DataTag>{policy.name}</DataTag>
                  </button>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditTarget(policy.name)}
                      aria-label={`Edit policy ${policy.name}`}
                      title="Edit policy"
                    >
                      <Pencil className="h-3.5 w-3.5 text-text-secondary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(policy.name)}
                      aria-label={`Delete policy ${policy.name}`}
                      title="Delete policy"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-status-bad" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <CreatePolicyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => mutate()}
      />

      <EditPolicyModal
        policyName={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => mutate()}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
        title="Delete policy"
        description={`This removes the policy "${deleteTarget}". Users or groups it's attached to will lose the permissions it granted.`}
        confirmLabel="Delete policy"
      />
    </div>
  );
}
