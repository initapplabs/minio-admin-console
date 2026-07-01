"use client";

import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-border-subtle">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-3.5 py-2.5 text-sm font-medium relative transition-colors",
            active === tab.id ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
          )}
        >
          {tab.label}
          {active === tab.id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t" />}
        </button>
      ))}
    </div>
  );
}
