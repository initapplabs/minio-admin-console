"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { DataTag } from "@/components/ui/Card";
import { ObjectBrowser } from "@/components/buckets/ObjectBrowser";
import { BucketAccessPanel } from "@/components/buckets/BucketAccessPanel";
import { BucketSettingsPanel } from "@/components/buckets/BucketSettingsPanel";
import { BucketLifecyclePanel } from "@/components/buckets/BucketLifecyclePanel";
import { ArrowLeft } from "lucide-react";

const TABS = [
  { id: "objects", label: "Objects" },
  { id: "access", label: "Access" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "settings", label: "Settings" },
];

export default function BucketDetailPage() {
  const params = useParams<{ bucket: string }>();
  const bucket = decodeURIComponent(params.bucket);
  const [tab, setTab] = useState("objects");

  return (
    <div className="space-y-4">
      <div>
        <Link href="/buckets" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary mb-2">
          <ArrowLeft className="h-3 w-3" />
          All buckets
        </Link>
        <h2 className="text-lg font-semibold">
          <DataTag>{bucket}</DataTag>
        </h2>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="pt-2">
        {tab === "objects" && <ObjectBrowser bucket={bucket} />}
        {tab === "access" && <BucketAccessPanel bucket={bucket} />}
        {tab === "lifecycle" && <BucketLifecyclePanel bucket={bucket} />}
        {tab === "settings" && <BucketSettingsPanel bucket={bucket} />}
      </div>
    </div>
  );
}
