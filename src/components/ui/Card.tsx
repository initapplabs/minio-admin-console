import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border-subtle bg-bg-panel", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 border-b border-border-subtle flex items-center justify-between", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold text-text-primary tracking-tight", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

type StatusKind = "good" | "warn" | "bad" | "neutral";

const statusColors: Record<StatusKind, string> = {
  good: "bg-status-good",
  warn: "bg-status-warn",
  bad: "bg-status-bad",
  neutral: "bg-text-muted",
};

export function StatusDot({ status, pulse = false }: { status: StatusKind; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && (
        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping", statusColors[status])} />
      )}
      <span className={cn("relative inline-flex rounded-full h-2 w-2", statusColors[status])} />
    </span>
  );
}

const badgeVariants: Record<StatusKind, string> = {
  good: "bg-status-good/10 text-status-good border-status-good/30",
  warn: "bg-status-warn/10 text-status-warn border-status-warn/30",
  bad: "bg-status-bad/10 text-status-bad border-status-bad/30",
  neutral: "bg-bg-raised text-text-secondary border-border-default",
};

export function Badge({
  children,
  status = "neutral",
  className,
}: {
  children: React.ReactNode;
  status?: StatusKind;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        badgeVariants[status],
        className
      )}
    >
      {children}
    </span>
  );
}

export function DataTag({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("data-tag", className)}>{children}</span>;
}
