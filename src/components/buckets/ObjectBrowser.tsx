"use client";

import { useState, useRef, useCallback } from "react";
import useSWR from "swr";
import { fetcher, apiDelete, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DataTag } from "@/components/ui/Card";
import { EmptyState, TableSkeleton } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { formatBytes, timeAgo } from "@/lib/utils";
import { Folder, FileIcon, Upload, FolderPlus, Trash2, Download, Link2, ChevronRight, Home } from "lucide-react";
import { toast } from "sonner";

interface ObjectEntry {
  key: string;
  isDir: boolean;
  size: number;
  lastModified?: string;
}

export function ObjectBrowser({ bucket }: { bucket: string }) {
  const [prefix, setPrefix] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ObjectEntry | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, error, isLoading, mutate } = useSWR<{ objects: ObjectEntry[] }>(
    `/api/buckets/${encodeURIComponent(bucket)}/objects?prefix=${encodeURIComponent(prefix)}`,
    fetcher
  );

  const breadcrumbs = prefix.split("/").filter(Boolean);

  const navigateTo = (depth: number) => {
    setPrefix(depth === 0 ? "" : breadcrumbs.slice(0, depth).join("/") + "/");
  };

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("prefix", prefix);
        Array.from(files).forEach((f) => formData.append("files", f));
        const res = await fetch(`/api/buckets/${encodeURIComponent(bucket)}/objects`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new ApiError(body.error ?? "Upload failed", res.status);
        }
        const result = await res.json();
        toast.success(`Uploaded ${result.uploaded.length} file${result.uploaded.length === 1 ? "" : "s"}`);
        mutate();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [bucket, prefix, mutate]
  );

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    try {
      await fetch(`/api/buckets/${encodeURIComponent(bucket)}/objects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-folder", prefix: `${prefix}${folderName.trim()}` }),
      });
      toast.success(`Folder "${folderName}" created`);
      setFolderName("");
      setFolderModalOpen(false);
      mutate();
    } catch {
      toast.error("Failed to create folder");
    }
  };

  const handleDelete = async (entry: ObjectEntry) => {
    try {
      const params = new URLSearchParams({ key: entry.key, recursive: String(entry.isDir) });
      await apiDelete(`/api/buckets/${encodeURIComponent(bucket)}/objects?${params}`);
      toast.success(`Deleted ${entry.key.split("/").pop()}`);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  const handleDownload = (key: string) => {
    window.open(`/api/buckets/${encodeURIComponent(bucket)}/objects/download?key=${encodeURIComponent(key)}`, "_blank");
  };

  const handleShare = async (key: string) => {
    try {
      const res = await fetch(`/api/buckets/${encodeURIComponent(bucket)}/objects/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, expirySeconds: 3600, mode: "download" }),
      });
      const data = await res.json();
      setShareUrl(data.url);
    } catch {
      toast.error("Failed to create share link");
    }
  };

  const objects = data?.objects ?? [];

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleUpload(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1 text-sm text-text-secondary min-w-0 overflow-x-auto">
          <button onClick={() => navigateTo(0)} className="flex items-center gap-1 hover:text-text-primary px-1.5 py-1 rounded">
            <Home className="h-3.5 w-3.5" />
          </button>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="h-3 w-3 text-text-muted" />
              <button onClick={() => navigateTo(i + 1)} className="hover:text-text-primary font-mono px-1 py-1 rounded">
                {crumb}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setFolderModalOpen(true)}>
            <FolderPlus className="h-3.5 w-3.5" />
            New folder
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()} loading={uploading}>
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border-subtle bg-bg-panel">
        {isLoading ? (
          <TableSkeleton rows={5} cols={3} />
        ) : error ? (
          <p className="text-sm text-status-bad p-6">{error.message}</p>
        ) : objects.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="This location is empty"
            description="Drag and drop files here, or use the Upload button."
          />
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_120px_140px_100px] gap-4 px-5 py-2.5 border-b border-border-subtle text-xs font-medium text-text-muted uppercase tracking-wide">
              <span>Name</span>
              <span>Size</span>
              <span>Modified</span>
              <span />
            </div>
            <div className="divide-y divide-border-subtle">
              {objects.map((entry) => (
                <div
                  key={entry.key}
                  className="grid grid-cols-[1fr_120px_140px_100px] gap-4 px-5 py-3 items-center hover:bg-bg-raised/50 transition-colors group"
                >
                  {entry.isDir ? (
                    <button
                      onClick={() => setPrefix(entry.key)}
                      className="flex items-center gap-2.5 min-w-0 text-left"
                    >
                      <Folder className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-sm font-mono truncate">{entry.key.replace(prefix, "").replace(/\/$/, "")}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileIcon className="h-4 w-4 text-text-muted shrink-0" />
                      <span className="text-sm font-mono truncate">{entry.key.replace(prefix, "")}</span>
                    </div>
                  )}
                  <span className="text-sm text-text-secondary font-mono">{entry.isDir ? "—" : formatBytes(entry.size)}</span>
                  <span className="text-sm text-text-muted">{entry.isDir ? "—" : timeAgo(entry.lastModified)}</span>
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!entry.isDir && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleShare(entry.key)} aria-label="Share link">
                          <Link2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(entry.key)} aria-label="Download">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(entry)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-status-bad" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={folderModalOpen} onClose={() => setFolderModalOpen(false)} title="New folder" size="sm">
        <div className="space-y-4">
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="folder-name"
            autoFocus
            className="font-mono"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateFolder} disabled={!folderName.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={shareUrl !== null} onClose={() => setShareUrl(null)} title="Share link" description="Expires in 1 hour" size="md">
        <div className="flex gap-2">
          <Input readOnly value={shareUrl ?? ""} className="font-mono text-xs" />
          <Button
            variant="secondary"
            onClick={() => {
              if (shareUrl) navigator.clipboard.writeText(shareUrl);
              toast.success("Copied to clipboard");
            }}
          >
            Copy
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
        title={deleteTarget?.isDir ? "Delete folder" : "Delete object"}
        description={`This permanently deletes "${deleteTarget?.key}"${deleteTarget?.isDir ? " and everything inside it" : ""}.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
