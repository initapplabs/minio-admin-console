"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher, apiPut, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Lock, Download, Upload, Globe, CheckCircle2 } from "lucide-react";

// ─── Preset definitions ───────────────────────────────────────────────────────

type PresetId = "none" | "download" | "upload" | "public";

const PRESETS: { id: PresetId; label: string; description: string; icon: React.ElementType }[] = [
  { id: "none", label: "Private", description: "No public access", icon: Lock },
  { id: "download", label: "Read-only", description: "Anyone can download", icon: Download },
  { id: "upload", label: "Write-only", description: "Anyone can upload", icon: Upload },
  { id: "public", label: "Public", description: "Full public read & write", icon: Globe },
];

// ─── Policy generators ────────────────────────────────────────────────────────

function buildPolicy(bucket: string, preset: PresetId): string | null {
  const arn = `arn:aws:s3:::${bucket}`;
  const objArn = `${arn}/*`;

  if (preset === "none") return "";

  const statementMap: Record<Exclude<PresetId, "none">, object[]> = {
    download: [
      { Effect: "Allow", Principal: { AWS: ["*"] }, Action: ["s3:GetBucketLocation", "s3:ListBucket"], Resource: [arn] },
      { Effect: "Allow", Principal: { AWS: ["*"] }, Action: ["s3:GetObject"], Resource: [objArn] },
    ],
    upload: [
      { Effect: "Allow", Principal: { AWS: ["*"] }, Action: ["s3:GetBucketLocation", "s3:ListBucketMultipartUploads"], Resource: [arn] },
      { Effect: "Allow", Principal: { AWS: ["*"] }, Action: ["s3:AbortMultipartUpload", "s3:DeleteObject", "s3:ListMultipartUploadParts", "s3:PutObject"], Resource: [objArn] },
    ],
    public: [
      { Effect: "Allow", Principal: { AWS: ["*"] }, Action: ["s3:GetBucketLocation", "s3:ListBucket", "s3:ListBucketMultipartUploads"], Resource: [arn] },
      { Effect: "Allow", Principal: { AWS: ["*"] }, Action: ["s3:DeleteObject", "s3:GetObject", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts", "s3:PutObject"], Resource: [objArn] },
    ],
  };

  return JSON.stringify({ Version: "2012-10-17", Statement: statementMap[preset as Exclude<PresetId, "none">] }, null, 2);
}

// ─── Normalization helper (compare ignoring whitespace) ────────────────────────

function normalizeJson(json: string): string {
  try {
    return JSON.stringify(deepSort(JSON.parse(json)));
  } catch {
    return json.trim();
  }
}

function deepSort(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(deepSort)
      .sort((a, b) => {
        const sa = typeof a === "object" && a !== null ? JSON.stringify(a) : String(a);
        const sb = typeof b === "object" && b !== null ? JSON.stringify(b) : String(b);
        return sa < sb ? -1 : sa > sb ? 1 : 0;
      });
  }
  if (value && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record).sort()) {
      sorted[key] = deepSort(record[key]);
    }
    return sorted;
  }
  return value;
}

function detectActivePreset(bucket: string, policyJson: string | null | undefined): PresetId | null {
  const currentNorm = policyJson ? normalizeJson(policyJson) : "";

  // No policy → private
  if (!currentNorm) return "none";

  for (const preset of PRESETS) {
    if (preset.id === "none") continue;
    const generated = buildPolicy(bucket, preset.id);
    if (generated && normalizeJson(generated) === currentNorm) return preset.id;
  }
  return null; // custom policy that doesn't match any preset
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function BucketAccessPanel({ bucket }: { bucket: string }) {
  const { data, mutate } = useSWR<{ policyJson: string | null }>(
    `/api/buckets/${encodeURIComponent(bucket)}/policy`,
    fetcher
  );

  const [policyText, setPolicyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewingPreset, setPreviewingPreset] = useState<PresetId | null>(null);

  // Sync server state into textarea
  useEffect(() => {
    if (data !== undefined) {
      setPolicyText(data.policyJson ?? "");
      setPreviewingPreset(null); // reset preview when fresh data arrives
    }
  }, [data]);

  // Which preset is currently active on the server?
  const serverPreset = detectActivePreset(bucket, data?.policyJson);
  // Which preset is highlighted (active or just clicked-to-preview)?
  const highlightedPreset = previewingPreset ?? serverPreset;

  // Click a preset → load its JSON into textarea (no server request yet)
  const handlePresetClick = (id: PresetId) => {
    const json = buildPolicy(bucket, id);
    setPolicyText(json ?? "");
    setPreviewingPreset(id);
  };

  const handleSavePolicy = async () => {
    setSaving(true);
    try {
      if (!policyText.trim()) {
        // Empty policy = set to private (none)
        await apiPut(`/api/buckets/${encodeURIComponent(bucket)}/policy`, { anonymousAccess: "none" });
      } else {
        await apiPut(`/api/buckets/${encodeURIComponent(bucket)}/policy`, { policyJson: policyText });
      }
      toast.success("Policy saved");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Quick access presets</CardTitle>
          {previewingPreset !== null && previewingPreset !== serverPreset && (
            <span className="text-xs text-accent font-medium">
              Preview — click Save to apply
            </span>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESETS.map((preset) => {
              const isActive = highlightedPreset === preset.id;
              const isServer = serverPreset === preset.id;
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset.id)}
                  className={cn(
                    "relative rounded-md border p-3 text-left transition-all duration-150",
                    isActive
                      ? "border-accent bg-accent/10 shadow-[0_0_0_1px_rgba(255,107,53,0.4)]"
                      : "border-border-default bg-bg-raised hover:border-accent/40 hover:bg-accent/5"
                  )}
                >
                  {/* Active check badge */}
                  {isServer && (
                    <CheckCircle2 className="absolute top-2 right-2 h-3.5 w-3.5 text-accent" />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 mb-2",
                      isActive ? "text-accent" : "text-text-muted"
                    )}
                  />
                  <p className={cn("text-sm font-medium", isActive ? "text-accent" : "text-text-primary")}>
                    {preset.label}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">{preset.description}</p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-text-muted mt-3">
            {serverPreset
              ? <>Current access: <span className="text-text-secondary font-medium">{PRESETS.find((p) => p.id === serverPreset)?.label ?? "Custom"}</span>. Click a preset to preview its policy below, then click Save to apply.</>
              : "This bucket has a custom policy. Click a preset to override it, or edit the JSON below directly."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bucket policy (JSON)</CardTitle>
          <Button variant="primary" size="sm" onClick={handleSavePolicy} loading={saving}>
            Save policy
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={14}
            value={policyText}
            onChange={(e) => {
              setPolicyText(e.target.value);
              // If user types manually, deselect any previewed preset
              setPreviewingPreset(null);
            }}
            placeholder={`{\n  "Version": "2012-10-17",\n  "Statement": []\n}`}
            className="font-mono text-xs"
          />
          <p className="text-xs text-text-muted mt-2">
            Standard AWS S3-style bucket policy JSON. Clear the field and save to revert to private (no public access).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
