"use client";

import { useEffect, useRef, useState } from "react";
import { formatUsd, formatCompact } from "@/lib/utils";

interface HeroStatsProps {
  totalDistributed: number;
  totalClicks: number;
  listingCount: number;
}

export function HeroStats({
  totalDistributed,
  totalClicks,
  listingCount,
}: HeroStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
      <StatCell
        label="Distributed"
        value={formatUsd(totalDistributed)}
        accent
      />
      <StatCell
        label="Verified clicks"
        value={formatCompact(totalClicks)}
      />
      <StatCell label="Live listings" value={String(listingCount)} />
    </div>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      setDisplay(value);
      prev.current = value;
    }
  }, [value]);

  return (
    <div className="bg-card p-3 text-center sm:p-4">
      <div
        className={`font-mono text-lg font-bold tnum sm:text-2xl ${
          accent ? "text-accent-text" : "text-foreground"
        }`}
      >
        {display}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">
        {label}
      </div>
    </div>
  );
}
