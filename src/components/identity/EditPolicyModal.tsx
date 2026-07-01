"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea, Label, FieldError } from "@/components/ui/Input";
import { fetcher, apiPut, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { DataTag } from "@/components/ui/Card";

interface PolicyDetail {
  name: string;
  policy?: unknown;
}

interface EditPolicyModalProps {
  policyName: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditPolicyModal({ policyName, onClose, onSaved }: EditPolicyModalProps) {
  const open = policyName !== null;

  const { data, isLoading, error } = useSWR<{ policy: PolicyDetail }>(
    policyName ? `/api/policies/${encodeURIComponent(policyName)}` : null,
    fetcher
  );

  const [policyJson, setPolicyJson] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // Sync fetched policy into textarea
  useEffect(() => {
    if (data?.policy?.policy) {
      setPolicyJson(JSON.stringify(data.policy.policy, null, 2));
    } else {
      setPolicyJson("");
    }
    setFieldError(undefined);
  }, [data, policyName]);

  const handleSave = async () => {
    setFieldError(undefined);
    try {
      JSON.parse(policyJson);
    } catch {
      setFieldError("Policy is not valid JSON");
      return;
    }
    setSaving(true);
    try {
      await apiPut(`/api/policies/${encodeURIComponent(policyName!)}`, { policyJson });
      toast.success(`Policy "${policyName}" updated`);
      onSaved();
      onClose();
    } catch (err) {
      setFieldError(err instanceof ApiError ? err.message : "Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit policy"
      size="lg"
      description="Modify the IAM policy document. Changes will take effect immediately for any users or groups attached to this policy."
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Policy name:</span>
          <DataTag>{policyName}</DataTag>
        </div>

        {isLoading && (
          <div className="h-48 flex items-center justify-center">
            <span className="text-sm text-text-muted animate-pulse">Loading policy…</span>
          </div>
        )}

        {error && (
          <p className="text-sm text-status-bad">
            Failed to load policy: {error.message}
          </p>
        )}

        {!isLoading && !error && (
          <div>
            <Label htmlFor="edit-policy-json">Policy document (JSON)</Label>
            <Textarea
              id="edit-policy-json"
              rows={16}
              value={policyJson}
              onChange={(e) => {
                setPolicyJson(e.target.value);
                setFieldError(undefined);
              }}
              className="font-mono text-xs"
            />
            <FieldError>{fieldError}</FieldError>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={saving}
            disabled={isLoading || !!error}
            onClick={handleSave}
          >
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
