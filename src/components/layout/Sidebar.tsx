"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LogOut } from "lucide-react";
import { navSections } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/api-client";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await apiPost("/api/auth/logout");
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-border-subtle bg-bg-panel">
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border-subtle shrink-0">
        <div className="rounded-md bg-accent/10 border border-accent/30 p-1.5">
          <Boxes className="h-4 w-4 text-accent" />
        </div>
        <span className="text-sm font-semibold tracking-tight">MinIO Console</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted px-2 mb-1.5">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-accent/10 text-accent font-medium"
                        : "text-text-secondary hover:bg-bg-raised hover:text-text-primary"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border-subtle shrink-0">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-text-secondary hover:bg-bg-raised hover:text-text-primary transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
