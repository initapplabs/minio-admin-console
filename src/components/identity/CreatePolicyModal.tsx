"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/Input";
import { apiPost, ApiError } from "@/lib/api-client";
import { toast } from "sonner";

const TEMPLATE = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": ["arn:aws:s3:::bucket-name/*"]
    }
  ]
}`;

export function CreatePolicyModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [policyJson, setPolicyJson] = useState(TEMPLATE);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    try {
      JSON.parse(policyJson);
    } catch {
      setError("Policy is not valid JSON");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/api/policies", { name, policyJson });
      toast.success(`Policy "${name}" created`);
      setName("");
      setPolicyJson(TEMPLATE);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create policy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create policy" size="lg" description="Define an IAM policy using standard AWS-style policy JSON.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="policy-name">Policy name</Label>
          <Input id="policy-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required className="font-mono" />
        </div>
        <div>
          <Label htmlFor="policy-json">Policy document</Label>
          <Textarea id="policy-json" rows={14} value={policyJson} onChange={(e) => setPolicyJson(e.target.value)} />
          <FieldError>{error}</FieldError>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!name}>
            Create policy
          </Button>
        </div>
      </form>
    </Modal>
  );
}
