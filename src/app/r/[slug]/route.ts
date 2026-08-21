import { db, schema } from "@/db";
import { eq, and, sql, gt } from "drizzle-orm";
import {
  getClientIp,
  visitorHash,
  scoreClick,
  looksLikeNonBrowser,
  DEDUP_WINDOW_MS,
} from "@/lib/fraud";
import { redirectLimiter, hasRedis } from "@/lib/redis";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// We do NOT cache redirects — every click must be tracked.
export const fetchCache = "force-no-store";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;

  const [listing] = await db
    .select()
    .from(schema.listings)
    .where(eq(schema.listings.slug, slug))
    .limit(1);

  if (!listing || listing.status === "banned" || listing.hidden) {
    return new Response("Not found", { status: 404 });
  }

  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? "";
  const referer = req.headers.get("referer") ?? null;
  const vHash = visitorHash(ip, ua);

  // Rate limit per visitor (best-effort)
  if (hasRedis && redirectLimiter) {
    try {
      const { success } = await redirectLimiter.limit(`r:${vHash}`);
      if (!success) {
        // still redirect, but don't record a click
        return Response.redirect(listing.url, 302);
      }
    } catch (error) {
      console.error("redirect rate limiter unavailable", error);
    }
  }

  const nonBrowser = looksLikeNonBrowser(req);

  const since = new Date(Date.now() - DEDUP_WINDOW_MS);
  try {
    await db.transaction(async (tx) => {
      // Prevent simultaneous requests from the same visitor from both being
      // counted as verified before either click is visible to the other.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${listing.id}:${vHash}`}))`,
      );
      const [recent] = await tx
        .select({ id: schema.clicks.id })
        .from(schema.clicks)
        .where(
          and(
            eq(schema.clicks.listingId, listing.id),
            eq(schema.clicks.visitorHash, vHash),
            gt(schema.clicks.createdAt, since),
          ),
        )
        .limit(1);
      const verdict = scoreClick({
        ua,
        isNonBrowser: nonBrowser,
        isDuplicate: !!recent,
      });

      await tx.insert(schema.clicks).values({
        id: nanoid(12),
        listingId: listing.id,
        visitorHash: vHash,
        userAgent: ua.slice(0, 512),
        referer: referer ? referer.slice(0, 512) : null,
        isBot: verdict.isBot,
        isVerified: verdict.isVerified,
        fraudScore: verdict.fraudScore,
      });

      await tx
        .update(schema.listings)
        .set({
          verifiedClicks: sql`${schema.listings.verifiedClicks} + ${verdict.isVerified ? 1 : 0}`,
          rawClicks: sql`${schema.listings.rawClicks} + 1`,
        })
        .where(eq(schema.listings.id, listing.id));
    });
  } catch (e) {
    // Tracking must never prevent the visitor from reaching the paid listing.
    console.error("click tracking failed", e);
  }

  return Response.redirect(listing.url, 302);
}
