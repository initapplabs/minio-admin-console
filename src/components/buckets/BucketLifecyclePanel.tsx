"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiPost, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Clock, Plus } from "lucide-react";
import { toast } from "sonner";

export function BucketLifecyclePanel({ bucket }: { bucket: string }) {
  const { data, mutate } = useSWR<{ rules: any[] }>(`/api/buckets/${encodeURIComponent(bucket)}/lifecycle`, fetcher);
  const [prefix, setPrefix] = useState("");
  const [expireDays, setExpireDays] = useState("");
  const [saving, setSaving] = useState(false);

  const rules = data?.rules ?? [];

  const handleAdd = async () => {
    if (!expireDays) return;
    setSaving(true);
    try {
      await apiPost(`/api/buckets/${encodeURIComponent(bucket)}/lifecycle`, {
        prefix: prefix || undefined,
        expireDays: parseInt(expireDays, 10),
      });
      toast.success("Lifecycle rule added");
      setPrefix("");
      setExpireDays("");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Add expiration rule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>Prefix (optional)</Label>
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="logs/" className="font-mono" />
            </div>
            <div className="w-40">
              <Label>Expire after (days)</Label>
              <Input type="number" min="1" value={expireDays} onChange={(e) => setExpireDays(e.target.value)} placeholder="30" />
            </div>
            <Button variant="primary" onClick={handleAdd} loading={saving} disabled={!expireDays}>
              <Plus className="h-4 w-4" />
              Add rule
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active rules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rules.length === 0 ? (
            <EmptyState icon={Clock} title="No lifecycle rules" description="Objects in this bucket will be kept indefinitely." />
          ) : (
            <pre className="text-xs font-mono p-5 overflow-auto text-text-secondary">{JSON.stringify(rules, null, 2)}</pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
