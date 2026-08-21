"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Crown, ExternalLink } from "lucide-react";
import { cn, formatUsd, formatCompact, hostnameOf } from "@/lib/utils";
import type { LeaderboardRow } from "@/lib/queries";

interface LeaderboardProps {
  initialRows: LeaderboardRow[];
}

export function Leaderboard({ initialRows }: LeaderboardProps) {
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/leaderboard", { next: { revalidate: 0 } });
        if (!res.ok) return;
        const data = (await res.json()) as { rows: LeaderboardRow[] };
        if (active) setRows(data.rows);
      } catch {
        /* keep stale */
      }
    };
    const id = setInterval(tick, 15000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">
          No listings yet. Be the first.
        </p>
      </div>
    );
  }

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="space-y-3">
      {/* Top 3 podium — the byproduct people screenshot */}
      {podium.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {podium.map((row, i) => (
            <PodiumCard key={row.id} row={row} rank={i + 1} />
          ))}
        </div>
      )}

      {/* Rest of the board */}
      {rest.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          {rest.map((row, i) => (
            <LeaderboardRowItem key={row.id} row={row} rank={i + 4} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Big podium card for top 3. #1 gets the crown + accent treatment. */
function PodiumCard({ row, rank }: { row: LeaderboardRow; rank: number }) {
  const isLeader = rank === 1;
  return (
    <Link
      href={`/r/${row.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border p-4 transition-all hover:scale-[1.01]",
        isLeader
          ? "border-accent/50 bg-gradient-to-b from-accent/[0.10] to-transparent sm:order-2 sm:scale-[1.04]"
          : rank === 2
            ? "border-border bg-card sm:order-1"
            : "border-border bg-card sm:order-3",
      )}
    >
      {isLeader && (
        <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground rank-pulse">
          <Crown className="h-3.5 w-3.5" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
          {row.logoUrl ? (
            <Image
              src={row.logoUrl}
              alt={row.name}
              fill
              unoptimized
              sizes="40px"
              className="object-cover"
            />
          ) : row.faviconUrl ? (
            <Image
              src={row.faviconUrl}
              alt={row.name}
              fill
              unoptimized
              sizes="40px"
              className="object-contain p-1"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
              {row.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-mono text-xs font-bold tnum",
                isLeader ? "text-accent-text" : "text-muted-foreground",
              )}
            >
              #{rank}
            </span>
            <h3 className="truncate text-sm font-semibold tracking-tight">
              {row.name}
            </h3>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {hostnameOf(row.url)}
          </p>
        </div>
      </div>

      {row.description && (
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
          {row.description}
        </p>
      )}

      <div className="mt-3 flex items-end justify-between border-t border-border/60 pt-3">
        <div>
          <div
            className={cn(
              "font-mono text-xl font-bold tnum sm:text-2xl",
              isLeader ? "text-accent-text" : "text-foreground",
            )}
          >
            {formatUsd(row.currentBidCents)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            current bid
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-medium tnum">
            {formatCompact(row.verifiedClicks)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            clicks
          </div>
        </div>
      </div>
    </Link>
  );
}

function LeaderboardRowItem({
  row,
  rank,
}: {
  row: LeaderboardRow;
  rank: number;
}) {
  return (
    <Link
      href={`/r/${row.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 border-b border-border/60 px-3 py-3 transition-colors last:border-0 hover:bg-muted/40 sm:px-4"
    >
      <div className="w-6 shrink-0 text-center font-mono text-sm font-medium text-muted-foreground tnum">
        {rank}
      </div>

      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
        {row.logoUrl ? (
          <Image
            src={row.logoUrl}
            alt={row.name}
            fill
            unoptimized
            sizes="36px"
            className="object-cover"
          />
        ) : row.faviconUrl ? (
          <Image
            src={row.faviconUrl}
            alt={row.name}
            fill
            unoptimized
            sizes="36px"
            className="object-contain p-1"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
            {row.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{row.name}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {hostnameOf(row.url)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {row.description ?? ""}
        </p>
      </div>

      <div className="hidden text-right sm:block">
        <div className="text-xs text-muted-foreground tnum">
          {formatCompact(row.verifiedClicks)} clicks
        </div>
      </div>

      <div className="flex w-24 shrink-0 items-center justify-end gap-1.5 sm:w-32">
        <span className="font-mono text-sm font-semibold tnum sm:text-base">
          {formatUsd(row.currentBidCents)}
        </span>
        <ExternalLink className="h-3 w-3 text-muted-foreground/30 transition-colors group-hover:text-accent-text" />
      </div>
    </Link>
  );
}
