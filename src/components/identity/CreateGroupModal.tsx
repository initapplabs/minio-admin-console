"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHelp, FieldError } from "@/components/ui/Input";
import { apiPost, ApiError } from "@/lib/api-client";
import { toast } from "sonner";

export function CreateGroupModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [membersText, setMembersText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      const members = membersText.split(",").map((m) => m.trim()).filter(Boolean);
      await apiPost("/api/groups", { name, members });
      toast.success(`Group "${name}" created`);
      setName("");
      setMembersText("");
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create group" description="Groups let you attach one policy to many users at once.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="group-name">Group name</Label>
          <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required className="font-mono" />
          <FieldError>{error}</FieldError>
        </div>
        <div>
          <Label htmlFor="members">Initial members (optional)</Label>
          <Input id="members" value={membersText} onChange={(e) => setMembersText(e.target.value)} placeholder="user1, user2" className="font-mono" />
          <FieldHelp>Comma-separated access keys of existing users.</FieldHelp>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!name}>
            Create group
          </Button>
        </div>
      </form>
    </Modal>
  );
}
