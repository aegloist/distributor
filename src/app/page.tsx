import { getLeaderboard, getLeaderboardStats } from "@/lib/queries";
import { Leaderboard } from "@/components/leaderboard";
import { SubmitBar } from "@/components/submit-bar";
import { formatUsd, formatCompact } from "@/lib/utils";
import { MAX_BID_CENTS } from "@/lib/bidding";

export const revalidate = 30;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; bid?: string }>;
}) {
  const { url: prefillUrl, bid: prefillBid } = await searchParams;
  const parsedBid = Number(prefillBid);
  const prefillBidCents =
    Number.isInteger(parsedBid) &&
    parsedBid >= 1 &&
    parsedBid * 100 <= MAX_BID_CENTS
      ? parsedBid * 100
      : undefined;
  const [rows, stats] = await Promise.all([
    getLeaderboard(100),
    getLeaderboardStats(),
  ]);

  return (
    <div className="relative min-h-screen">
      {/* Grid background */}
      <div className="fixed inset-0 grid-bg opacity-50" aria-hidden />

      <div className="relative mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Real analytics strip — all numbers from the database */}
        <div className="mb-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          <Stat
            label="distributed"
            value={formatUsd(stats.totalDistributed)}
            highlight
          />
          <Dot />
          <Stat
            label="active listings"
            value={stats.listingCount.toString()}
          />
          <Dot />
          <Stat
            label="verified clicks"
            value={formatCompact(stats.totalVerifiedClicks)}
          />
          <Dot />
          <Stat
            label="unique visitors"
            value={formatCompact(stats.uniqueVisitors)}
          />
          <Dot />
          <Stat
            label="clicks / 24h"
            value={formatCompact(stats.clicksLast24h)}
          />
          <Dot />
          <Stat
            label="active / 1h"
            value={stats.visitorsLast1h.toString()}
          />
        </div>

        {/* Submit bar */}
        <div id="submit" className="mb-6 scroll-mt-20 rounded-xl border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm sm:p-4">
          <SubmitBar
            initialUrl={prefillUrl ?? ""}
            initialBidCents={prefillBidCents}
          />
        </div>

        {/* The leaderboard IS the page */}
        <Leaderboard initialRows={rows} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <span className="whitespace-nowrap">
      <span
        className={
          "font-mono font-semibold tnum " +
          (highlight ? "text-accent-text" : "text-foreground")
        }
      >
        {value}
      </span>{" "}
      {label}
    </span>
  );
}

function Dot() {
  return <span className="text-border">·</span>;
}
