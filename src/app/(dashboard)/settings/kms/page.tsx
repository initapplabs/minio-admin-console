"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiPost, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge, DataTag } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LockKeyhole, Plus } from "lucide-react";
import { toast } from "sonner";

interface KmsResponse {
  status: { available?: boolean; error?: string } | Record<string, unknown>;
  keys: Array<{ keyId: string; status: string }>;
}

export default function KmsPage() {
  const { data, error, isLoading, mutate } = useSWR<KmsResponse>("/api/admin/kms", fetcher);
  const [keyId, setKeyId] = useState("");
  const [creating, setCreating] = useState(false);

  const status = data?.status as { available?: boolean; error?: string } | undefined;
  const isAvailable = status && status.available !== false && !status.error;

  const handleCreate = async () => {
    if (!keyId.trim()) return;
    setCreating(true);
    try {
      await apiPost("/api/admin/kms", { keyId: keyId.trim() });
      toast.success(`KMS key "${keyId}" created`);
      setKeyId("");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>KMS connection</CardTitle>
          {!isLoading && <Badge status={isAvailable ? "good" : "bad"}>{isAvailable ? "Connected" : "Unavailable"}</Badge>}
        </CardHeader>
        <CardContent>
          {!isLoading && !isAvailable && (
            <p className="text-sm text-text-muted">
              No external KMS is configured for this MinIO deployment, or it could not be reached.
              {status?.error && <span className="block mt-1 font-mono text-xs text-status-bad">{status.error}</span>}
            </p>
          )}
          {isAvailable && <p className="text-sm text-text-secondary">An external KMS is connected and serving encryption keys for SSE-KMS.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Encryption keys</CardTitle>
        </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 mb-4">
              <div className="flex-1">
                <Label>New key ID</Label>
                <Input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="my-app-key" className="font-mono" />
              </div>
              <Button variant="primary" onClick={handleCreate} loading={creating} disabled={!keyId.trim()}>
                <Plus className="h-4 w-4" />
                Create key
              </Button>
            </div>

            {(data?.keys?.length ?? 0) === 0 ? (
              <EmptyState icon={LockKeyhole} title="No keys yet" description="Create a KMS key to use for SSE-KMS bucket encryption." />
            ) : (
              <div className="divide-y divide-border-subtle border border-border-subtle rounded-md">
                {data?.keys.map((key) => (
                  <div key={key.keyId} className="flex items-center justify-between px-4 py-2.5">
                    <DataTag>{key.keyId}</DataTag>
                    <Badge status="good">{key.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      {error && <p className="text-sm text-status-bad">{error.message}</p>}
    </div>
  );
}
