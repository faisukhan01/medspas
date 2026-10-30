"use client";

import { Construction } from "lucide-react";
import { PageHeader, SectionCard } from "../ui";

export default function AnalyticsView() {
  return (
    <div>
      <PageHeader title="Analytics" subtitle="Module loading…" />
      <SectionCard>
        <div className="flex flex-col items-center py-14 text-stone-400">
          <Construction className="size-8 mb-3" />
          <p className="text-sm">Analytics module is being built right now — check back in a moment.</p>
        </div>
      </SectionCard>
    </div>
  );
}
