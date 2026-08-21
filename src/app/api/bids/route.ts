import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { desc, eq, and } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns just the current bids (desc) so the client can compute
 * "what rank would a new bid of $X land me at" instantly.
 * Cheap payload — just an array of cents.
 */
export async function GET() {
  const rows = await db
    .select({ bid: schema.listings.currentBidCents })
    .from(schema.listings)
    .where(
      and(
        eq(schema.listings.status, "active"),
        eq(schema.listings.hidden, false),
      ),
    )
    .orderBy(desc(schema.listings.currentBidCents));
  return NextResponse.json(
    { bids: rows.map((r) => r.bid) },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
