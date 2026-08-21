import { db, schema } from "@/db";
import { desc, eq, and, sql } from "drizzle-orm";

/** Public leaderboard: active, not hidden, ranked by current bid desc. */
export async function getLeaderboard(limit = 100) {
  const rows = await db
    .select({
      id: schema.listings.id,
      slug: schema.listings.slug,
      url: schema.listings.url,
      name: schema.listings.name,
      description: schema.listings.description,
      logoUrl: schema.listings.logoUrl,
      faviconUrl: schema.listings.faviconUrl,
      category: schema.listings.category,
      currentBidCents: schema.listings.currentBidCents,
      totalPaidCents: schema.listings.totalPaidCents,
      verifiedClicks: schema.listings.verifiedClicks,
      rawClicks: schema.listings.rawClicks,
      goal: schema.listings.goal,
      createdAt: schema.listings.createdAt,
      updatedAt: schema.listings.updatedAt,
      bidUpdatedAt: schema.listings.bidUpdatedAt,
    })
    .from(schema.listings)
    .where(
      and(
        eq(schema.listings.status, "active"),
        eq(schema.listings.hidden, false),
      ),
    )
    .orderBy(
      desc(schema.listings.currentBidCents),
      desc(schema.listings.bidUpdatedAt),
      desc(schema.listings.id),
    )
    .limit(limit);
  return rows;
}

export interface LeaderboardRow {
  id: string;
  slug: string;
  url: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  category: string | null;
  currentBidCents: number;
  totalPaidCents: number;
  verifiedClicks: number;
  rawClicks: number;
  goal: typeof schema.listings.goal.enumValues[number] | null;
  createdAt: Date;
  updatedAt: Date;
  bidUpdatedAt: Date;
}

export async function getLeaderboardStats() {
  // Listing-level aggregates (real money + click counters)
  const [listingAgg] = await db
    .select({
      totalDistributed: sql<number>`coalesce(sum(${schema.listings.totalPaidCents}), 0)`,
      totalVerifiedClicks: sql<number>`coalesce(sum(${schema.listings.verifiedClicks}), 0)`,
      totalRawClicks: sql<number>`coalesce(sum(${schema.listings.rawClicks}), 0)`,
      listingCount: sql<number>`count(*)`,
    })
    .from(schema.listings)
    .where(
      and(
        eq(schema.listings.status, "active"),
        eq(schema.listings.hidden, false),
      ),
    );

  // Click-level aggregates from the actual clicks table
  const [clickAgg] = await db
    .select({
      totalClickEvents: sql<number>`count(*)`,
      verifiedClickEvents: sql<number>`count(*) filter (where ${schema.clicks.isVerified})`,
      botClickEvents: sql<number>`count(*) filter (where ${schema.clicks.isBot})`,
      uniqueVisitors: sql<number>`count(distinct ${schema.clicks.visitorHash})`,
      clicksLast24h: sql<number>`count(*) filter (where ${schema.clicks.createdAt} > now() - interval '24 hours')`,
      visitorsLast1h: sql<number>`count(distinct ${schema.clicks.visitorHash}) filter (where ${schema.clicks.createdAt} > now() - interval '1 hour')`,
    })
    .from(schema.clicks);

  // Bid event count
  const [bidAgg] = await db
    .select({
      totalBids: sql<number>`count(*)`,
    })
    .from(schema.bidEvents);

  return {
    // Money
    totalDistributed: Number(listingAgg?.totalDistributed ?? 0),
    // Listings
    listingCount: Number(listingAgg?.listingCount ?? 0),
    // Clicks (from listing counters — fast)
    totalVerifiedClicks: Number(listingAgg?.totalVerifiedClicks ?? 0),
    totalRawClicks: Number(listingAgg?.totalRawClicks ?? 0),
    // Clicks (from clicks table — detailed)
    totalClickEvents: Number(clickAgg?.totalClickEvents ?? 0),
    verifiedClickEvents: Number(clickAgg?.verifiedClickEvents ?? 0),
    botClickEvents: Number(clickAgg?.botClickEvents ?? 0),
    uniqueVisitors: Number(clickAgg?.uniqueVisitors ?? 0),
    clicksLast24h: Number(clickAgg?.clicksLast24h ?? 0),
    visitorsLast1h: Number(clickAgg?.visitorsLast1h ?? 0),
    // Bids
    totalBids: Number(bidAgg?.totalBids ?? 0),
  };
}

export async function getListingBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(schema.listings)
    .where(eq(schema.listings.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getListingById(id: string) {
  const [row] = await db
    .select()
    .from(schema.listings)
    .where(eq(schema.listings.id, id))
    .limit(1);
  return row ?? null;
}

export async function getBidHistory(listingId: string, limit = 50) {
  return db
    .select()
    .from(schema.bidEvents)
    .where(eq(schema.bidEvents.listingId, listingId))
    .orderBy(desc(schema.bidEvents.createdAt))
    .limit(limit);
}

export async function getRankOf(listing: {
  id: string;
  currentBidCents: number;
  bidUpdatedAt: Date;
}): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*) + 1` })
    .from(schema.listings)
    .where(
      and(
        eq(schema.listings.status, "active"),
        eq(schema.listings.hidden, false),
        sql`(
          ${schema.listings.currentBidCents} > ${listing.currentBidCents}
          or (
            ${schema.listings.currentBidCents} = ${listing.currentBidCents}
            and (
              ${schema.listings.bidUpdatedAt} > ${listing.bidUpdatedAt.toISOString()}::timestamptz
              or (
                ${schema.listings.bidUpdatedAt} = ${listing.bidUpdatedAt.toISOString()}::timestamptz
                and ${schema.listings.id} > ${listing.id}
              )
            )
          )
        )`,
      ),
    );
  return Number(row?.c ?? 1);
}

/** All listings for admin (including hidden/banned). */
export async function getAllListingsAdmin(limit = 200) {
  return db
    .select()
    .from(schema.listings)
    .orderBy(desc(schema.listings.currentBidCents))
    .limit(limit);
}
