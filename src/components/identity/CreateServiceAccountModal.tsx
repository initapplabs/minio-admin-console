"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { apiPost, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { Copy, AlertTriangle } from "lucide-react";

export function CreateServiceAccountModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [parentUser, setParentUser] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ accessKey: string; secretKey: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      const res = await apiPost<{ accessKey: string; secretKey: string }>("/api/service-accounts", {
        parentUser,
        name: name || undefined,
      });
      setResult(res);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create service account");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setParentUser("");
    setName("");
    setResult(null);
    onClose();
  };

  if (result) {
    return (
      <Modal open={open} onClose={handleClose} title="Service account created" size="md">
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-md border border-status-warn/30 bg-status-warn/10 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-status-warn shrink-0 mt-0.5" />
            <p className="text-xs text-status-warn">
              The secret key is shown only once. Copy it now — it cannot be retrieved later.
            </p>
          </div>
          <div>
            <Label>Access key</Label>
            <div className="flex gap-2">
              <Input readOnly value={result.accessKey} className="font-mono" />
              <Button variant="secondary" size="icon" onClick={() => navigator.clipboard.writeText(result.accessKey)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Secret key</Label>
            <div className="flex gap-2">
              <Input readOnly value={result.secretKey} className="font-mono" />
              <Button variant="secondary" size="icon" onClick={() => navigator.clipboard.writeText(result.secretKey)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create service account" description="Generates a new access/secret key pair scoped to a parent user.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="parent-user">Parent user (access key)</Label>
          <Input id="parent-user" value={parentUser} onChange={(e) => setParentUser(e.target.value)} autoFocus required className="font-mono" />
          <FieldError>{error}</FieldError>
        </div>
        <div>
          <Label htmlFor="sa-name">Display name (optional)</Label>
          <Input id="sa-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ci-pipeline" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!parentUser}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
