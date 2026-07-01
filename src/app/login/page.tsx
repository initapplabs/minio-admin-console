"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Input";
import { apiPost, ApiError } from "@/lib/api-client";
import { Boxes, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/auth/login", { accessKey, secretKey });
      router.push("/buckets");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base px-4 relative overflow-hidden">
      {/* Ambient grid background — quiet, technical texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="rounded-md bg-accent/10 border border-accent/30 p-2">
            <Boxes className="h-5 w-5 text-accent" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MinIO Console</span>
        </div>

        <div className="rounded-lg border border-border-subtle bg-bg-panel p-6">
          <h1 className="text-sm font-semibold text-text-primary mb-1">Sign in</h1>
          <p className="text-xs text-text-muted mb-5">
            Use your MinIO admin access key and secret key.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="accessKey">Access key</Label>
              <Input
                id="accessKey"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="secretKey">Secret key</Label>
              <Input
                id="secretKey"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                autoComplete="current-password"
                required
                className="font-mono"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-status-bad/30 bg-status-bad/10 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-status-bad shrink-0 mt-0.5" />
                <p className="text-xs text-status-bad">{error}</p>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-xs text-text-muted text-center mt-5">
          These credentials authenticate directly against your MinIO deployment.
        </p>
      </div>
    </div>
  );
}
