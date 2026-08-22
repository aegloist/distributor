import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { polar, polarProductId } from "@/lib/polar";
import { MAX_BID_CENTS, MIN_BID_CENTS } from "@/lib/bidding";
import { normalizePublicUrl, slugify } from "@/lib/utils";
import { submitLimiter, hasRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  url: z.string().min(3).max(2048),
  name: z.string().min(1).max(80),
  description: z.string().max(280).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  goal: z.enum(["traffic", "signups", "customers", "awareness"]).default("traffic"),
  bidCents: z
    .number()
    .int()
    .min(MIN_BID_CENTS)
    .max(MAX_BID_CENTS)
    .refine((value) => value % 100 === 0, "Bids must use whole dollars."),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const input = parsed.data;
  let normalizedUrl: string;
  try {
    normalizedUrl = normalizePublicUrl(input.url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid URL" },
      { status: 400 },
    );
  }

  // rate limit
  if (hasRedis && submitLimiter) {
    try {
      const ip =
        req.headers.get("cf-connecting-ip") ??
        req.headers.get("x-forwarded-for")?.split(",")[0] ??
        "anon";
      const { success } = await submitLimiter.limit(`checkout:${ip}`);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Slow down." },
          { status: 429 },
        );
      }
    } catch (error) {
      console.error("checkout rate limiter unavailable", error);
    }
  }

  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Payments not configured. Set POLAR_ACCESS_TOKEN." },
      { status: 503 },
    );
  }

  // Look up existing listing by URL (bid-increase path)
  const [existing] = await db
    .select()
    .from(schema.listings)
    .where(eq(schema.listings.url, normalizedUrl))
    .limit(1);

  let chargeCents: number;
  let resultingBidCents: number;
  let listingId: string | null = null;
  let isIncrease = false;

  if (existing?.status === "banned") {
    return NextResponse.json({ error: "This URL cannot be listed." }, { status: 403 });
  }

  if (existing) {
    if (input.bidCents <= existing.currentBidCents) {
      return NextResponse.json(
        {
          error: `This URL is already listed at $${(existing.currentBidCents / 100).toFixed(2)}. Bid higher to outbid it.`,
        },
        { status: 409 },
      );
    }
    chargeCents = input.bidCents - existing.currentBidCents;
    resultingBidCents = input.bidCents;
    listingId = existing.id;
    isIncrease = true;
  } else {
    chargeCents = input.bidCents;
    resultingBidCents = input.bidCents;
  }

  let provisionalSlug: string | null = null;
  if (!existing) {
    const base = slugify(input.name) || "listing";
    provisionalSlug = `${base}-${nanoid(6)}`;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const pid = polarProductId();

  // Store all context as metadata so the webhook can reconstruct everything.
  // Polar rejects empty strings in metadata, so only include fields with values.
  const metadata: Record<string, string> = {
    kind: "distributor_bid",
    isIncrease: isIncrease ? "1" : "0",
    url: normalizedUrl,
    name: input.name,
    goal: input.goal,
    resultingBidCents: String(resultingBidCents),
    chargeCents: String(chargeCents),
  };
  if (listingId) metadata.listingId = listingId;
  if (input.description) metadata.description = input.description;
  if (input.category) metadata.category = input.category;
  if (provisionalSlug) metadata.provisionalSlug = provisionalSlug;

  try {
    const checkout = await polar().checkouts.create({
      products: [pid],
      prices: {
        [pid]: [
          {
            amountType: "fixed",
            priceAmount: chargeCents,
            priceCurrency: "usd",
          },
        ],
      },
      successUrl: `${appUrl}/checkout/success?checkoutId={CHECKOUT_ID}`,
      allowDiscountCodes: false,
      metadata,
    });

    return NextResponse.json({ url: checkout.url, sessionId: checkout.id });
  } catch (e) {
    console.error("polar checkout error", e);
    return NextResponse.json(
      { error: "Could not start checkout. Try again." },
      { status: 500 },
    );
  }
}
