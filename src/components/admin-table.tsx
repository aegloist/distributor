"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Ban,
  EyeOff,
  Eye,
  RotateCcw,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { formatUsd, formatCompact, hostnameOf, cn } from "@/lib/utils";
import type { Listing } from "@/db/schema";

export function AdminTable({ listings }: { listings: Listing[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, action: string) {
    setBusy(`${id}:${action}`);
    try {
      const res = await fetch(`/api/admin/listing/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Action failed");
      }
      toast.success(`${action} done`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Listing</th>
            <th className="px-3 py-2 font-medium">Bid</th>
            <th className="px-3 py-2 font-medium">Clicks</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {listings.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                No listings.
              </td>
            </tr>
          )}
          {listings.map((l) => (
            <tr key={l.id} className={cn(l.hidden && "opacity-50")}>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/l/${l.slug}`}
                    className="font-medium hover:underline"
                  >
                    {l.name}
                  </Link>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="text-xs text-muted-foreground">
                  {hostnameOf(l.url)}
                </div>
              </td>
              <td className="px-3 py-2 font-mono tnum">
                {formatUsd(l.currentBidCents)}
                <div className="text-xs text-muted-foreground">
                  paid {formatUsd(l.totalPaidCents)}
                </div>
              </td>
              <td className="px-3 py-2 font-mono tnum">
                {formatCompact(l.verifiedClicks)}
                <div className="text-xs text-muted-foreground">
                  raw {formatCompact(l.rawClicks)}
                </div>
              </td>
              <td className="px-3 py-2">
                {l.status === "banned" ? (
                  <Badge variant="destructive">banned</Badge>
                ) : l.status === "refunded" ? (
                  <Badge variant="secondary">refunded</Badge>
                ) : l.hidden ? (
                  <Badge variant="outline">hidden</Badge>
                ) : (
                  <Badge variant="success">active</Badge>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-1">
                  {l.hidden ? (
                    <IconBtn
                      title="Unhide"
                      onClick={() => act(l.id, "unhide")}
                      loading={busy === `${l.id}:unhide`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </IconBtn>
                  ) : (
                    <IconBtn
                      title="Hide"
                      onClick={() => act(l.id, "hide")}
                      loading={busy === `${l.id}:hide`}
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </IconBtn>
                  )}
                  {l.status === "banned" ? (
                    <IconBtn
                      title="Unban"
                      onClick={() => act(l.id, "unban")}
                      loading={busy === `${l.id}:unban`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </IconBtn>
                  ) : (
                    <IconBtn
                      title="Ban"
                      onClick={() => act(l.id, "ban")}
                      loading={busy === `${l.id}:ban`}
                      destructive
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </IconBtn>
                  )}
                  <IconBtn
                    title="Refund latest payment"
                    onClick={() => {
                      if (
                        confirm(
                          "Refund the latest payment for this listing? This lowers its bid.",
                        )
                      ) {
                        act(l.id, "refund");
                      }
                    }}
                    loading={busy === `${l.id}:refund`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  loading,
  title,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  title: string;
  destructive?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", destructive && "hover:text-destructive")}
      onClick={onClick}
      disabled={loading}
      title={title}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </Button>
  );
}
