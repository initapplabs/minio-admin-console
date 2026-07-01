import {
  Boxes,
  Users,
  UsersRound,
  ShieldCheck,
  KeyRound,
  Activity,
  ScrollText,
  Layers,
  LockKeyhole,
  Settings2,
  ListChecks,
  LayoutDashboard,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof Boxes;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    label: "Storage",
    items: [
      { label: "Overview", href: "/overview", icon: LayoutDashboard },
      { label: "Buckets", href: "/buckets", icon: Boxes },
    ],
  },
  {
    label: "Identity",
    items: [
      { label: "Users", href: "/identity/users", icon: Users },
      { label: "Groups", href: "/identity/groups", icon: UsersRound },
      { label: "Policies", href: "/identity/policies", icon: ShieldCheck },
      { label: "Service accounts", href: "/identity/service-accounts", icon: KeyRound },
    ],
  },
  {
    label: "Operate",
    items: [
      { label: "Monitoring", href: "/monitoring", icon: Activity },
      { label: "Logs", href: "/monitoring/logs", icon: ScrollText },
      { label: "Batch jobs", href: "/batch", icon: ListChecks },
    ],
  },
  {
    label: "Configure",
    items: [
      { label: "Storage tiers", href: "/settings/tiers", icon: Layers },
      { label: "Encryption (KMS)", href: "/settings/kms", icon: LockKeyhole },
      { label: "Server config", href: "/settings/config", icon: Settings2 },
    ],
  },
];
