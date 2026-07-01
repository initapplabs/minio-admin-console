"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api-client";
import { StatusDot } from "@/components/ui/Card";
import { usePathname } from "next/navigation";
import { navSections } from "@/lib/nav";

interface ServerInfoResponse {
  info: {
    mode?: string;
    servers?: Array<{ endpoint: string; state: string; uptime?: number }>;
    deploymentID?: string;
  };
}

function pageTitle(pathname: string): string {
  for (const section of navSections) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) return item.label;
    }
  }
  return "Console";
}

export function Topbar() {
  const pathname = usePathname();
  const { data, error } = useSWR<ServerInfoResponse>("/api/admin/info", fetcher, {
    refreshInterval: 15_000,
  });

  const servers = data?.info?.servers ?? [];
  const onlineCount = servers.filter((s) => s.state === "online").length;
  const totalCount = servers.length;
  const allOnline = totalCount > 0 && onlineCount === totalCount;
  const someOnline = onlineCount > 0 && onlineCount < totalCount;

  const status = error ? "bad" : allOnline ? "good" : someOnline ? "warn" : totalCount === 0 ? "neutral" : "bad";

  return (
    <header className="h-14 sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border-subtle bg-bg-base/80 backdrop-blur px-6">
      <h1 className="text-sm font-semibold text-text-primary">{pageTitle(pathname)}</h1>

      <div className="flex items-center gap-4">
        {/* Signature element: live cluster pulse strip */}
        <div className="flex items-center gap-2.5 rounded-full border border-border-default bg-bg-panel pl-1 pr-3 py-1">
          <div className="relative h-5 w-16 overflow-hidden rounded-full bg-bg-raised">
            {status !== "bad" && (
              <div
                className="absolute inset-y-0 left-0 w-1/3 pulse-sweep"
                style={{
                  background: `linear-gradient(90deg, transparent, var(--status-${status === "neutral" ? "good" : status}), transparent)`,
                }}
              />
            )}
          </div>
          <StatusDot status={status} pulse={status === "good"} />
          <span className="text-xs font-mono text-text-secondary">
            {totalCount > 0 ? `${onlineCount}/${totalCount} nodes` : error ? "unreachable" : "—"}
          </span>
        </div>
      </div>
    </header>
  );
}
