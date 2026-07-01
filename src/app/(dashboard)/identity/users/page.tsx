"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiPatch, apiDelete, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, DataTag } from "@/components/ui/Card";
import { EmptyState, TableSkeleton } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreateUserModal } from "@/components/identity/CreateUserModal";
import { Users, Plus, Trash2, Power } from "lucide-react";
import { toast } from "sonner";

interface UserRow {
  accessKey: string;
  status: "enabled" | "disabled";
  policyName?: string;
}

export default function UsersPage() {
  const { data, error, isLoading, mutate } = useSWR<{ users: UserRow[] }>("/api/users", fetcher);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const toggleStatus = async (user: UserRow) => {
    try {
      await apiPatch(`/api/users/${encodeURIComponent(user.accessKey)}`, {
        status: user.status === "enabled" ? "disable" : "enable",
      });
      toast.success(`User ${user.status === "enabled" ? "disabled" : "enabled"}`);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update user");
    }
  };

  const handleDelete = async (accessKey: string) => {
    try {
      await apiDelete(`/api/users/${encodeURIComponent(accessKey)}`);
      toast.success(`User "${accessKey}" deleted`);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete user");
    }
  };

  const users = data?.users ?? [];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create user
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton rows={5} cols={3} />
        ) : error ? (
          <p className="text-sm text-status-bad p-6">{error.message}</p>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users yet" description="Create IAM users to grant programmatic or console access." />
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_140px_180px_120px] gap-4 px-5 py-2.5 border-b border-border-subtle text-xs font-medium text-text-muted uppercase tracking-wide">
              <span>Access key</span>
              <span>Status</span>
              <span>Policy</span>
              <span />
            </div>
            <div className="divide-y divide-border-subtle">
              {users.map((user) => (
                <div key={user.accessKey} className="grid grid-cols-[1fr_140px_180px_120px] gap-4 px-5 py-3.5 items-center hover:bg-bg-raised/50">
                  <DataTag>{user.accessKey}</DataTag>
                  <Badge status={user.status === "enabled" ? "good" : "neutral"}>{user.status}</Badge>
                  <span className="text-sm text-text-secondary font-mono truncate">{user.policyName ?? "—"}</span>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleStatus(user)} aria-label="Toggle status">
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(user.accessKey)} aria-label="Delete user">
                      <Trash2 className="h-3.5 w-3.5 text-status-bad" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => mutate()} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
        title="Delete user"
        description={`This permanently removes the user "${deleteTarget}". Any sessions or service accounts they own will stop working.`}
        confirmLabel="Delete user"
      />
    </div>
  );
}
