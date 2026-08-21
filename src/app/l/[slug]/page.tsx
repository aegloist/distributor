import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getListingBySlug, getBidHistory, getRankOf } from "@/lib/queries";
import { ListingActions } from "@/components/listing-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Crown,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  History,
} from "lucide-react";
import { formatUsd, formatCompact, hostnameOf, cn } from "@/lib/utils";

export const revalidate = 15;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return { title: "Not found" };
  return {
    title: `${listing.name}: ${formatUsd(listing.currentBidCents)} bid`,
    description:
      listing.description ??
      `${listing.name} on the distributor.lol leaderboard.`,
    openGraph: {
      title: `${listing.name}: ${formatUsd(listing.currentBidCents)}`,
      description: listing.description ?? `${listing.name} on distributor.lol`,
      images: [`/api/og/${listing.slug}`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${listing.name}: ${formatUsd(listing.currentBidCents)}`,
      description: listing.description ?? "",
      images: [`/api/og/${listing.slug}`],
    },
  };
}

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { slug } = await params;
  const { paid } = await searchParams;
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status === "banned") notFound();

  const [rank, history] = await Promise.all([
    getRankOf(listing),
    getBidHistory(listing.id, 20),
  ]);

  const isLeader = rank === 1;
  const redirectUrl = `/r/${listing.slug}`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      {paid === "1" && (
        <div className="mb-6 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm">
          <p className="font-medium text-accent-text">Payment received. You&apos;re live.</p>
          <p className="mt-1 text-muted-foreground">
            Your listing is on the leaderboard. Share this page to drive
            verified traffic.
          </p>
        </div>
      )}

      {/* Header card */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm",
          isLeader ? "border-accent/40" : "border-border",
        )}
      >
        {isLeader && (
          <div className="absolute right-4 top-4">
            <Badge variant="accent" className="gap-1">
              <Crown className="h-3 w-3" /> #1
            </Badge>
          </div>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
            {listing.logoUrl ? (
              <Image
                src={listing.logoUrl}
                alt={listing.name}
                fill
                unoptimized
                sizes="64px"
                className="object-cover"
              />
            ) : listing.faviconUrl ? (
              <Image
                src={listing.faviconUrl}
                alt={listing.name}
                fill
                unoptimized
                sizes="64px"
                className="object-contain p-2"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-muted-foreground">
                {listing.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {listing.name}
              </h1>
              {listing.category && (
                <Badge variant="outline">{listing.category}</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {hostnameOf(listing.url)}
            </p>
            {listing.description && (
              <p className="mt-3 text-pretty text-base text-foreground/90">
                {listing.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="accent" size="lg">
                <a href={redirectUrl} target="_blank" rel="noopener noreferrer">
                  Visit site <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href={`/?url=${encodeURIComponent(listing.url)}#submit`}>
                  <TrendingUp className="h-4 w-4" /> Outbid this
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        <Stat
          icon={<DollarSign className="h-3.5 w-3.5" />}
          label="Current bid"
          value={formatUsd(listing.currentBidCents)}
          accent
        />
        <Stat
          icon={<Crown className="h-3.5 w-3.5" />}
          label="Rank"
          value={`#${rank}`}
        />
        <Stat
          icon={<MousePointerClick className="h-3.5 w-3.5" />}
          label="Verified clicks"
          value={formatCompact(listing.verifiedClicks)}
        />
        <Stat
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Total paid"
          value={formatUsd(listing.totalPaidCents)}
        />
      </div>

      {/* Share + actions */}
      <ListingActions slug={listing.slug} name={listing.name} />

      {/* Bid history */}
      {history.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4" /> Bid history
          </h2>
          <div className="mt-3 divide-y divide-border/60">
            {history.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-muted-foreground">
                  {new Date(b.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground tnum">
                    +{formatUsd(b.amountCents)}
                  </span>
                  <span className="font-mono font-semibold tnum">
                    {formatUsd(b.resultingBidCents)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-xl font-bold tnum sm:text-2xl",
          accent ? "text-accent-text" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}
