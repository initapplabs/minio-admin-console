"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError } from "@/components/ui/Input";
import { apiPost, ApiError } from "@/lib/api-client";
import { toast } from "sonner";

export function AddTierModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<"s3" | "azure" | "gcs" | "minio">("s3");
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [bucket, setBucket] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      await apiPost("/api/admin/tiers", { type, name, endpoint, bucket, accessKey, secretKey });
      toast.success(`Tier "${name}" added`);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add tier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add storage tier" description="Configure a remote tier for ILM transition rules." size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="s3">S3-compatible</option>
              <option value="azure">Azure Blob</option>
              <option value="gcs">Google Cloud Storage</option>
              <option value="minio">MinIO</option>
            </Select>
          </div>
          <div>
            <Label>Tier name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value.toUpperCase())} required className="font-mono" placeholder="COLDSTORAGE" />
          </div>
        </div>
        <div>
          <Label>Endpoint</Label>
          <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} required placeholder="https://s3.amazonaws.com" className="font-mono" />
        </div>
        <div>
          <Label>Bucket</Label>
          <Input value={bucket} onChange={(e) => setBucket(e.target.value)} required className="font-mono" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Access key</Label>
            <Input value={accessKey} onChange={(e) => setAccessKey(e.target.value)} required className="font-mono" />
          </div>
          <div>
            <Label>Secret key</Label>
            <Input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} required className="font-mono" />
          </div>
        </div>
        <FieldError>{error}</FieldError>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Add tier
          </Button>
        </div>
      </form>
    </Modal>
  );
}
