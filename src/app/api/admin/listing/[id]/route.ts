import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { hasValidRequestOrigin, isAdmin } from "@/lib/auth";
import { polar } from "@/lib/polar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorized() {
  return await isAdmin();
}

/** POST /api/admin/listing/[id] with { action: "hide" | "unhide" | "ban" | "unban" | "refund" } */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await authorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasValidRequestOrigin(req)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { action } = body as { action?: string };
  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  const [listing] = await db
    .select()
    .from(schema.listings)
    .where(eq(schema.listings.id, id))
    .limit(1);
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  switch (action) {
    case "hide":
      await db
        .update(schema.listings)
        .set({ hidden: true, updatedAt: new Date() })
        .where(eq(schema.listings.id, id));
      return NextResponse.json({ ok: true });
    case "unhide":
      await db
        .update(schema.listings)
        .set({ hidden: false, updatedAt: new Date() })
        .where(eq(schema.listings.id, id));
      return NextResponse.json({ ok: true });
    case "ban":
      await db
        .update(schema.listings)
        .set({ status: "banned", hidden: true, updatedAt: new Date() })
        .where(eq(schema.listings.id, id));
      return NextResponse.json({ ok: true });
    case "unban":
      await db
        .update(schema.listings)
        .set({ status: "active", hidden: false, updatedAt: new Date() })
        .where(eq(schema.listings.id, id));
      return NextResponse.json({ ok: true });
    case "refund":
      return await handleRefund(listing);
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

async function handleRefund(
  listing: typeof schema.listings.$inferSelect,
) {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Polar not configured" },
      { status: 503 },
    );
  }

  // Find the most recent bid event with a checkout/payment id
  const rows = await db
    .select()
    .from(schema.bidEvents)
    .where(eq(schema.bidEvents.listingId, listing.id))
    .orderBy(desc(schema.bidEvents.createdAt))
    .limit(50);

  const refunds = await db
    .select()
    .from(schema.refundEvents)
    .where(eq(schema.refundEvents.listingId, listing.id));
  const refundedByBid = new Map<string, number>();
  for (const refund of refunds) {
    refundedByBid.set(
      refund.bidEventId,
      (refundedByBid.get(refund.bidEventId) ?? 0) + refund.amountCents,
    );
  }

  const target = rows.find(
    (bid) =>
      !!bid.polarOrderId &&
      bid.amountCents > (refundedByBid.get(bid.id) ?? 0),
  );

  if (!target || !target.polarOrderId) {
    return NextResponse.json(
      { error: "No checkout to refund" },
      { status: 400 },
    );
  }

  try {
    const remainingCents =
      target.amountCents - (refundedByBid.get(target.id) ?? 0);

    await polar().refunds.create({
      orderId: target.polarOrderId,
      amount: remainingCents,
      reason: "customer_request",
    });

    // The webhook will handle lowering the bid / status.
    return NextResponse.json({ ok: true, refunded: true });
  } catch (e) {
    console.error("polar refund error", e);
    return NextResponse.json(
      { error: "Refund failed. Check Polar dashboard" },
      { status: 500 },
    );
  }
}
