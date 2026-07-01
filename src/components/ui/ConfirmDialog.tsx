"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  /** If set, the user must type this exact string to enable the confirm button. */
  requireTypedConfirmation?: string;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  requireTypedConfirmation,
  destructive = true,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);

  const canConfirm = !requireTypedConfirmation || typed === requireTypedConfirmation;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setTyped("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex gap-3">
        {destructive && (
          <div className="shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5 text-status-bad" />
          </div>
        )}
        <p className="text-sm text-text-secondary">{description}</p>
      </div>

      {requireTypedConfirmation && (
        <div className="mt-4">
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">
            Type <span className="data-tag">{requireTypedConfirmation}</span> to confirm
          </label>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus autoComplete="off" />
        </div>
      )}

      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant={destructive ? "danger" : "primary"}
          onClick={handleConfirm}
          disabled={!canConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
