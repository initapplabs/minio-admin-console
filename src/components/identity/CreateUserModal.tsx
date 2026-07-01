"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { apiPost, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

function randomSecret(): string {
  const bytes = new Uint8Array(30);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 32);
}

export function CreateUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState(randomSecret());
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      await apiPost("/api/users", { accessKey, secretKey });
      toast.success(`User "${accessKey}" created`);
      setAccessKey("");
      setSecretKey(randomSecret());
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create user" description="Adds a new IAM identity that can authenticate with these credentials.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="access-key">Access key</Label>
          <Input id="access-key" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} autoFocus required className="font-mono" />
          <FieldError>{error}</FieldError>
        </div>
        <div>
          <Label htmlFor="secret-key">Secret key</Label>
          <div className="flex gap-2">
            <Input id="secret-key" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} required className="font-mono" />
            <Button type="button" variant="ghost" size="icon" onClick={() => setSecretKey(randomSecret())} aria-label="Generate new secret">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!accessKey || secretKey.length < 8}>
            Create user
          </Button>
        </div>
      </form>
    </Modal>
  );
}
