"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeUrl, formatUsd, hostnameOf } from "@/lib/utils";
import { MIN_BID_CENTS } from "@/lib/bidding";

interface FetchedMeta {
  title: string | null;
  description: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  existingBidCents: number | null;
}

/**
 * outbid.lol-style submit bar with live metadata fetch.
 *
 * As you type a URL, we debounce-fetch OG metadata (logo, title,
 * description) and show a live preview card. The "Claim #X for $Y"
 * rank preview updates as you change the bid.
 */
export function SubmitBar({ initialUrl = "" }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [bidStr, setBidStr] = useState("1");
  const [creating, setCreating] = useState(false);
  const [bids, setBids] = useState<number[]>([]);

  // metadata fetch state
  const [metaResult, setMetaResult] = useState<{
    input: string;
    data: FetchedMeta;
  } | null>(null);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch current bids on mount + poll
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/bids", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { bids: number[] };
        if (active) setBids(data.bids);
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Debounced metadata fetch — fires 600ms after user stops typing URL
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || trimmed.length < 4) {
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const controller = new AbortController();
    debounceRef.current = setTimeout(async () => {
      setFetchingMeta(true);
      try {
        const res = await fetch("/api/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: normalizeUrl(trimmed) }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as FetchedMeta;
        setMetaResult({ input: trimmed, data });
      } catch {
        /* ignore — preview is nice-to-have */
      } finally {
        setFetchingMeta(false);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [url]);

  const bidCents = Math.round(Math.max(0, parseFloat(bidStr) || 0) * 100);

  const projectedRank = useCallback(() => {
    if (bidCents < MIN_BID_CENTS) return null;
    const higher = bids.filter((b) => b > bidCents).length;
    return higher + 1;
  }, [bidCents, bids]);

  const rank = projectedRank();

  // Use fetched metadata for the checkout payload
  const meta = metaResult?.input === url.trim() ? metaResult.data : null;
  const checkoutName = meta?.title ?? hostnameSafe(url);
  const checkoutDescription = meta?.description ?? null;

  async function handlePay() {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Paste a URL first.");
      return;
    }
    if (bidCents < MIN_BID_CENTS) {
      toast.error(`Minimum is ${formatUsd(MIN_BID_CENTS)}.`);
      return;
    }
    if (
      meta?.existingBidCents != null &&
      bidCents <= meta.existingBidCents
    ) {
      toast.error(
        `This listing is at ${formatUsd(meta.existingBidCents)}. Enter at least ${formatUsd(meta.existingBidCents + 100)}.`,
      );
      return;
    }
    await startCheckout();
  }

  async function startCheckout() {
    setCreating(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: normalizeUrl(url),
          name: checkoutName,
          description: checkoutDescription,
          category: null,
          goal: "traffic",
          bidCents,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Checkout failed");
      }
      const data = (await res.json()) as { url: string };
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
      setCreating(false);
    }
  }

  const hasPreview = meta && (meta.logoUrl || meta.faviconUrl || meta.title);

  return (
    <div className="w-full">
      {/* The claim line — "Claim #X for $Y" */}
      <div className="mb-3 text-center">
        {rank !== null ? (
          <p className="text-sm sm:text-base">
            Claim <span className="font-mono text-lg font-bold text-accent-text tnum sm:text-xl">#{rank}</span>{" "}
            for{" "}
            <span className="font-mono text-lg font-bold tnum sm:text-xl">
              {formatUsd(bidCents)}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Minimum bid is {formatUsd(MIN_BID_CENTS)}
          </p>
        )}
      </div>

      {/* URL + bid + pay */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="yourstartup.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 pl-9"
          />
          {fetchingMeta && (
            <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {!fetchingMeta && hasPreview && (
            <Check className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-accent-text" />
          )}
        </div>

        <div className="relative w-full sm:w-36">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-foreground">
            $
          </span>
          <Input
            type="number"
            min={MIN_BID_CENTS / 100}
            step={1}
            value={bidStr}
            onChange={(e) => setBidStr(e.target.value)}
            className="h-11 pl-7 pr-2 text-center font-mono text-lg font-bold tnum text-foreground"
          />
        </div>

        <Button
          variant="accent"
          size="lg"
          onClick={handlePay}
          disabled={
            creating ||
            !url.trim() ||
            bidCents < MIN_BID_CENTS ||
            (meta?.existingBidCents != null &&
              bidCents <= meta.existingBidCents)
          }
          className="h-11 shrink-0"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Claim spot <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* Live metadata preview — appears as you type the URL */}
      {hasPreview && (
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2.5">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta!.logoUrl ?? meta!.faviconUrl ?? ""}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {meta!.title ?? hostnameOf(url)}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {meta!.description ?? hostnameOf(url)}
            </p>
          </div>
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-accent-text">
            auto-fetched
          </span>
        </div>
      )}

      {meta?.existingBidCents != null && (
        <p className="mt-2 text-center text-xs font-medium text-accent-text">
          Already listed at {formatUsd(meta.existingBidCents)} — enter at least{" "}
          {formatUsd(meta.existingBidCents + 100)} to move up.
        </p>
      )}

      <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
        New spots start at {formatUsd(MIN_BID_CENTS)}. Paying less than the #1
        price still puts you on the board at whatever place that bid can take.
      </p>

      <p className="mt-1 text-center text-[11px] text-muted-foreground/70">
        Already on the list? Enter the same URL and up your bid.
      </p>
    </div>
  );
}

function hostnameSafe(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
