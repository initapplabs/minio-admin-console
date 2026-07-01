"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher, apiPut, apiDelete, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";

interface BucketDetailResponse {
  versioning: { Status?: string };
  quota: { quota: number; type: string } | null;
  encryption: { algorithm: string } | null;
}

export function BucketSettingsPanel({ bucket }: { bucket: string }) {
  const { data, mutate } = useSWR<BucketDetailResponse>(`/api/buckets/${encodeURIComponent(bucket)}`, fetcher);
  const [quotaValue, setQuotaValue] = useState("");
  const [quotaUnit, setQuotaUnit] = useState<"GB" | "TB">("GB");
  const [versioningLoading, setVersioningLoading] = useState(false);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [encryptionLoading, setEncryptionLoading] = useState(false);

  useEffect(() => {
    if (data?.quota) {
      const gb = data.quota.quota / (1024 * 1024 * 1024);
      if (gb >= 1024) {
        setQuotaValue((gb / 1024).toString());
        setQuotaUnit("TB");
      } else {
        setQuotaValue(gb.toString());
        setQuotaUnit("GB");
      }
    }
  }, [data]);

  const versioningEnabled = data?.versioning?.Status === "Enabled";

  const toggleVersioning = async () => {
    setVersioningLoading(true);
    try {
      await apiPut(`/api/buckets/${encodeURIComponent(bucket)}/versioning`, { enabled: !versioningEnabled });
      toast.success(`Versioning ${!versioningEnabled ? "enabled" : "suspended"}`);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update versioning");
    } finally {
      setVersioningLoading(false);
    }
  };

  const saveQuota = async () => {
    const num = parseFloat(quotaValue);
    if (!num || num <= 0) return;
    setQuotaLoading(true);
    try {
      const multiplier = quotaUnit === "TB" ? 1024 ** 4 : 1024 ** 3;
      await apiPut(`/api/buckets/${encodeURIComponent(bucket)}/quota`, { bytes: Math.round(num * multiplier) });
      toast.success("Quota updated");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to set quota");
    } finally {
      setQuotaLoading(false);
    }
  };

  const clearQuota = async () => {
    setQuotaLoading(true);
    try {
      await apiDelete(`/api/buckets/${encodeURIComponent(bucket)}/quota`);
      toast.success("Quota cleared");
      setQuotaValue("");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to clear quota");
    } finally {
      setQuotaLoading(false);
    }
  };

  const setEncryption = async (algorithm: "sse-s3" | "sse-kms") => {
    setEncryptionLoading(true);
    try {
      await apiPut(`/api/buckets/${encodeURIComponent(bucket)}/encryption`, { algorithm });
      toast.success("Encryption enabled");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to set encryption");
    } finally {
      setEncryptionLoading(false);
    }
  };

  const clearEncryption = async () => {
    setEncryptionLoading(true);
    try {
      await apiDelete(`/api/buckets/${encodeURIComponent(bucket)}/encryption`);
      toast.success("Encryption disabled");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to disable encryption");
    } finally {
      setEncryptionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Versioning</CardTitle>
          <Badge status={versioningEnabled ? "good" : "neutral"}>{data?.versioning?.Status ?? "Unknown"}</Badge>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-text-secondary max-w-md">
            Keep multiple versions of an object in the same bucket to protect against accidental deletion or overwrite.
          </p>
          <Button variant="secondary" onClick={toggleVersioning} loading={versioningLoading}>
            {versioningEnabled ? "Suspend" : "Enable"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storage quota</CardTitle>
          {data?.quota && <Badge status="warn">{formatBytes(data.quota.quota)} limit</Badge>}
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <Label>Hard limit</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={quotaValue}
                  onChange={(e) => setQuotaValue(e.target.value)}
                  placeholder="e.g. 100"
                />
                <Select value={quotaUnit} onChange={(e) => setQuotaUnit(e.target.value as "GB" | "TB")} className="w-24">
                  <option value="GB">GB</option>
                  <option value="TB">TB</option>
                </Select>
              </div>
            </div>
            <Button variant="secondary" onClick={saveQuota} loading={quotaLoading} disabled={!quotaValue}>
              Save
            </Button>
            {data?.quota && (
              <Button variant="ghost" onClick={clearQuota} loading={quotaLoading}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Server-side encryption</CardTitle>
          <Badge status={data?.encryption ? "good" : "neutral"}>{data?.encryption?.algorithm ?? "Disabled"}</Badge>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setEncryption("sse-s3")} loading={encryptionLoading}>
            Enable SSE-S3
          </Button>
          <Button variant="secondary" onClick={() => setEncryption("sse-kms")} loading={encryptionLoading}>
            Enable SSE-KMS
          </Button>
          {data?.encryption && (
            <Button variant="ghost" onClick={clearEncryption} loading={encryptionLoading}>
              Disable
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
