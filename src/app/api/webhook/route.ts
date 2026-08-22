import { Webhooks } from "@polar-sh/nextjs";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/db";
import { fetchMeta, isUsableMetadata } from "@/lib/metadata";
import { normalizePublicUrl, slugify } from "@/lib/utils";
import { MAX_BID_CENTS } from "@/lib/bidding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BidMetadata = z.object({
  kind: z.literal("distributor_bid"),
  url: z.string(),
  name: z.string().min(1).max(80),
  description: z.string().max(280).optional().default(""),
  category: z.string().max(60).optional().default(""),
  goal: z.enum(["traffic", "signups", "customers", "awareness"]),
  chargeCents: z.coerce.number().int().min(100).max(MAX_BID_CENTS),
  provisionalSlug: z.string().max(80).optional().default(""),
});

type PaidOrder = {
  id: string;
  checkoutId: string | null;
  subtotalAmount: number;
  metadata: Record<string, unknown>;
  customer: { email?: string | null };
};

type PolarRefund = {
  id: string;
  orderId: string;
  amount: number;
  status: string;
};

async function fulfillPaidOrder(order: PaidOrder) {
  if (!order.checkoutId) throw new Error(`Paid Polar order ${order.id} has no checkout ID.`);

  const parsed = BidMetadata.safeParse(order.metadata);
  if (!parsed.success) {
    throw new Error(`Paid Polar order ${order.id} has invalid bid metadata.`);
  }
  const meta = parsed.data;
  const url = normalizePublicUrl(meta.url);

  // The order is the trusted source for the amount. A mismatch means the bid
  // must not be applied until the configuration or event is investigated.
  if (order.subtotalAmount !== meta.chargeCents) {
    throw new Error(
      `Paid Polar order ${order.id} amount mismatch: ${order.subtotalAmount} != ${meta.chargeCents}`,
    );
  }

  // Listing metadata is fetched server-side. Client-supplied image URLs are
  // deliberately not trusted because OG rendering fetches images on the server.
  const [cachedMeta] = await db
    .select()
    .from(schema.metaCache)
    .where(eq(schema.metaCache.url, url))
    .limit(1);
  const fetched =
    cachedMeta &&
    isUsableMetadata(cachedMeta, url) &&
    Date.now() - cachedMeta.fetchedAt.getTime() < 86_400_000
      ? {
          title: cachedMeta.title,
          description: cachedMeta.description,
          logoUrl: cachedMeta.logoUrl,
          faviconUrl: cachedMeta.faviconUrl,
        }
      : await fetchMeta(url);
  const resolvedName = (fetched.title || meta.name).slice(0, 80);
  const resolvedDescription = (fetched.description || meta.description || "").slice(0, 280) || null;
  const baseSlug = slugify(resolvedName) || "listing";

  await db.transaction(async (tx) => {
    // Serialize all payments for one canonical URL, including two new
    // checkouts completed at the same time.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${url}))`);

    const [alreadyProcessed] = await tx
      .select({ id: schema.bidEvents.id })
      .from(schema.bidEvents)
      .where(eq(schema.bidEvents.polarCheckoutId, order.checkoutId!))
      .limit(1);
    if (alreadyProcessed) return;

    let [listing] = await tx
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.url, url))
      .limit(1);

    if (!listing) {
      let slug = meta.provisionalSlug || `${baseSlug}-${nanoid(6)}`;
      const [slugConflict] = await tx
        .select({ id: schema.listings.id })
        .from(schema.listings)
        .where(eq(schema.listings.slug, slug))
        .limit(1);
      if (slugConflict) slug = `${baseSlug}-${nanoid(8)}`;

      [listing] = await tx
        .insert(schema.listings)
        .values({
          id: nanoid(12),
          slug,
          url,
          name: resolvedName,
          description: resolvedDescription,
          category: meta.category || null,
          logoUrl: fetched.logoUrl,
          faviconUrl: fetched.faviconUrl,
          goal: meta.goal,
          currentBidCents: 0,
          totalPaidCents: 0,
          ownerEmail: order.customer.email ?? null,
          status: "active",
        })
        .returning();
    }

    const resultingBidCents = listing.currentBidCents + meta.chargeCents;
    const [recorded] = await tx
      .insert(schema.bidEvents)
      .values({
        id: nanoid(12),
        listingId: listing.id,
        amountCents: meta.chargeCents,
        resultingBidCents,
        polarCheckoutId: order.checkoutId,
        polarOrderId: order.id,
        ownerEmail: order.customer.email ?? null,
      })
      .onConflictDoNothing({ target: schema.bidEvents.polarCheckoutId })
      .returning({ id: schema.bidEvents.id });
    if (!recorded) return;

    await tx
      .update(schema.listings)
      .set({
        currentBidCents: resultingBidCents,
        totalPaidCents: listing.totalPaidCents + meta.chargeCents,
        name: resolvedName,
        description: resolvedDescription,
        category: meta.category || listing.category,
        logoUrl: fetched.logoUrl || listing.logoUrl,
        faviconUrl: fetched.faviconUrl || listing.faviconUrl,
        goal: meta.goal,
        ownerEmail: order.customer.email || listing.ownerEmail,
        // Preserve moderation state: banned stays banned, hidden stays hidden.
        // A payment on a hidden/banned listing still adds money (the charge happened)
        // but does not restore visibility. Admin can manually unhide/unban.
        status: listing.status,
        hidden: listing.hidden,
        updatedAt: new Date(),
        bidUpdatedAt: new Date(),
      })
      .where(eq(schema.listings.id, listing.id));
  });
}

async function applySuccessfulRefund(refund: PolarRefund) {
  if (refund.status !== "succeeded") return;

  await db.transaction(async (tx) => {
    const [bid] = await tx
      .select()
      .from(schema.bidEvents)
      .where(eq(schema.bidEvents.polarOrderId, refund.orderId))
      .limit(1);
    if (!bid) throw new Error(`Polar refund ${refund.id} has no matching bid event.`);

    await tx.execute(
      sql`select id from ${schema.listings} where ${schema.listings.id} = ${bid.listingId} for update`,
    );
    const [listing] = await tx
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, bid.listingId))
      .limit(1);
    if (!listing) throw new Error(`Polar refund ${refund.id} has no matching listing.`);

    const [recorded] = await tx
      .insert(schema.refundEvents)
      .values({
        id: refund.id,
        bidEventId: bid.id,
        listingId: listing.id,
        amountCents: refund.amount,
      })
      .onConflictDoNothing({ target: schema.refundEvents.id })
      .returning({ id: schema.refundEvents.id });
    if (!recorded) return;

    const newBid = Math.max(0, listing.currentBidCents - refund.amount);
    const newTotalPaid = Math.max(0, listing.totalPaidCents - refund.amount);
    await tx
      .update(schema.listings)
      .set({
        currentBidCents: newBid,
        totalPaidCents: newTotalPaid,
        status:
          listing.status === "banned"
            ? "banned"
            : newBid === 0
              ? "refunded"
              : "active",
        updatedAt: new Date(),
        bidUpdatedAt: new Date(),
      })
      .where(eq(schema.listings.id, listing.id));
  });
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onOrderPaid: async ({ data }) => fulfillPaidOrder(data),
  onRefundCreated: async ({ data }) => applySuccessfulRefund(data),
  onRefundUpdated: async ({ data }) => applySuccessfulRefund(data),
});
