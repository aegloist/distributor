import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const checkoutId = new URL(req.url).searchParams.get("checkoutId") ?? "";
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(checkoutId)) {
    return NextResponse.json({ error: "Invalid checkout ID" }, { status: 400 });
  }

  const [row] = await db
    .select({ slug: schema.listings.slug })
    .from(schema.bidEvents)
    .innerJoin(schema.listings, eq(schema.bidEvents.listingId, schema.listings.id))
    .where(eq(schema.bidEvents.polarCheckoutId, checkoutId))
    .limit(1);

  return NextResponse.json(
    row ? { status: "fulfilled", slug: row.slug } : { status: "processing" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
