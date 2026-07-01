"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiPatch, apiDelete, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, DataTag } from "@/components/ui/Card";
import { EmptyState, TableSkeleton } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreateGroupModal } from "@/components/identity/CreateGroupModal";
import { UsersRound, Plus, Trash2, Power } from "lucide-react";
import { toast } from "sonner";

interface GroupRow {
  name: string;
  status: "enabled" | "disabled";
  members: string[];
  policyName?: string;
}

export default function GroupsPage() {
  const { data, error, isLoading, mutate } = useSWR<{ groups: GroupRow[] }>("/api/groups", fetcher);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const toggleStatus = async (group: GroupRow) => {
    try {
      await apiPatch(`/api/groups/${encodeURIComponent(group.name)}`, {
        status: group.status === "enabled" ? "disable" : "enable",
      });
      toast.success(`Group ${group.status === "enabled" ? "disabled" : "enabled"}`);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update group");
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await apiDelete(`/api/groups/${encodeURIComponent(name)}`);
      toast.success(`Group "${name}" deleted`);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete group");
    }
  };

  const groups = data?.groups ?? [];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create group
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton rows={5} cols={3} />
        ) : error ? (
          <p className="text-sm text-status-bad p-6">{error.message}</p>
        ) : groups.length === 0 ? (
          <EmptyState icon={UsersRound} title="No groups yet" description="Create groups to manage policy assignments for many users at once." />
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_140px_1fr_120px] gap-4 px-5 py-2.5 border-b border-border-subtle text-xs font-medium text-text-muted uppercase tracking-wide">
              <span>Name</span>
              <span>Status</span>
              <span>Members</span>
              <span />
            </div>
            <div className="divide-y divide-border-subtle">
              {groups.map((group) => (
                <div key={group.name} className="grid grid-cols-[1fr_140px_1fr_120px] gap-4 px-5 py-3.5 items-center hover:bg-bg-raised/50">
                  <DataTag>{group.name}</DataTag>
                  <Badge status={group.status === "enabled" ? "good" : "neutral"}>{group.status}</Badge>
                  <span className="text-sm text-text-secondary truncate">
                    {group.members.length > 0 ? group.members.join(", ") : "—"}
                  </span>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleStatus(group)} aria-label="Toggle status">
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(group.name)} aria-label="Delete group">
                      <Trash2 className="h-3.5 w-3.5 text-status-bad" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => mutate()} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
        title="Delete group"
        description={`This permanently removes the group "${deleteTarget}". Members will lose any access granted only through this group.`}
        confirmLabel="Delete group"
      />
    </div>
  );
}
