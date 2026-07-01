"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHelp, FieldError } from "@/components/ui/Input";
import { apiPost, ApiError } from "@/lib/api-client";
import { toast } from "sonner";

export function CreateBucketModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [objectLocking, setObjectLocking] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      await apiPost("/api/buckets", { name, objectLocking });
      toast.success(`Bucket "${name}" created`);
      setName("");
      setObjectLocking(false);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create bucket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create bucket" description="Buckets hold your objects and apply shared settings to them.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="bucket-name">Bucket name</Label>
          <Input
            id="bucket-name"
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            placeholder="my-application-data"
            autoFocus
            required
            className="font-mono"
          />
          <FieldHelp>Lowercase letters, numbers, dots, and hyphens. 3–63 characters.</FieldHelp>
          <FieldError>{error}</FieldError>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={objectLocking}
            onChange={(e) => setObjectLocking(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border-default bg-bg-raised accent-[var(--accent)]"
          />
          <span>
            <span className="text-sm text-text-primary block">Enable object locking</span>
            <span className="text-xs text-text-muted">
              Enforces WORM retention. Requires versioning and cannot be disabled later.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={name.length < 3}>
            Create bucket
          </Button>
        </div>
      </form>
    </Modal>
  );
}
