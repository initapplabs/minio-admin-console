"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiPut, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHelp } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Card";
import { toast } from "sonner";

const FALLBACK_SUBSYSTEMS = ["region", "api", "compression", "logger_webhook", "audit_webhook", "notify_webhook"];

export default function ConfigPage() {
  const [subsystem, setSubsystem] = useState("region");
  const { data: subsystemsData } = useSWR<{ subsystems: string[] }>("/api/admin/config/subsystems", fetcher);
  const subsystems = subsystemsData?.subsystems ?? FALLBACK_SUBSYSTEMS;
  const { data, error, isLoading, mutate } = useSWR<{ config: string }>(
    `/api/admin/config?subsystem=${encodeURIComponent(subsystem)}`,
    fetcher
  );
  const [kv, setKv] = useState("");
  const [saving, setSaving] = useState(false);

  const handleApply = async () => {
    if (!kv.trim()) return;
    setSaving(true);
    try {
      const result = await apiPut<{ restartRequired: boolean }>("/api/admin/config", { kv });
      toast.success(result.restartRequired ? "Config set — server restart required" : "Config applied");
      setKv("");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to apply config");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Inspect subsystem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {subsystems.map((s) => (
              <button
                key={s}
                onClick={() => setSubsystem(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono border ${
                  subsystem === s ? "border-accent text-accent bg-accent/10" : "border-border-default text-text-secondary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : error ? (
            <p className="text-sm text-status-bad">{error.message}</p>
          ) : (
            <pre className="text-xs font-mono bg-bg-raised border border-border-subtle rounded-md p-4 overflow-auto whitespace-pre-wrap">
              {data?.config || "(empty)"}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apply config change</CardTitle>
          <Badge status="warn">May require restart</Badge>
        </CardHeader>
        <CardContent>
          <Label>Key-value pair</Label>
          <div className="flex gap-2">
            <Input value={kv} onChange={(e) => setKv(e.target.value)} placeholder="region name=us-east-1" className="font-mono" />
            <Button variant="primary" onClick={handleApply} loading={saving} disabled={!kv.trim()}>
              Apply
            </Button>
          </div>
          <FieldHelp>
            Same syntax as <code className="font-mono">mc admin config set</code>, e.g.{" "}
            <code className="font-mono">api requests_max=1600</code>
          </FieldHelp>
        </CardContent>
      </Card>
    </div>
  );
}
