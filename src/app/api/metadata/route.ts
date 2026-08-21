import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchMeta } from "@/lib/metadata";
import { normalizePublicUrl } from "@/lib/utils";
import { submitLimiter, hasRedis } from "@/lib/redis";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  url: z.string().min(3).max(2048),
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
      { error: parsed.error.issues[0]?.message ?? "Invalid URL" },
      { status: 400 },
    );
  }

  let normalized: string;
  try {
    normalized = normalizePublicUrl(parsed.data.url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid URL" },
      { status: 400 },
    );
  }

  // rate limit (best-effort)
  if (hasRedis && submitLimiter) {
    try {
      const ip =
        req.headers.get("cf-connecting-ip") ??
        req.headers.get("x-forwarded-for")?.split(",")[0] ??
        "anon";
      const { success } = await submitLimiter.limit(`meta:${ip}`);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Slow down." },
          { status: 429 },
        );
      }
    } catch (error) {
      console.error("metadata rate limiter unavailable", error);
    }
  }

  // check cache
  let existingBidCents: number | null = null;
  try {
    const [existing] = await db
      .select({
        currentBidCents: schema.listings.currentBidCents,
        status: schema.listings.status,
      })
      .from(schema.listings)
      .where(eq(schema.listings.url, normalized))
      .limit(1);
    if (existing && existing.status !== "banned") {
      existingBidCents = existing.currentBidCents;
    }

    const [cached] = await db
      .select()
      .from(schema.metaCache)
      .where(eq(schema.metaCache.url, normalized))
      .limit(1);
    // cache valid for 24h
    if (
      cached &&
      Date.now() - cached.fetchedAt.getTime() < 1000 * 60 * 60 * 24
    ) {
      return NextResponse.json({
        title: cached.title,
        description: cached.description,
        logoUrl: cached.logoUrl,
        faviconUrl: cached.faviconUrl,
        url: normalized,
        existingBidCents,
      });
    }
  } catch {
    // DB optional in this path; continue to fetch
  }

  const meta = await fetchMeta(normalized);

  // persist cache (best-effort)
  try {
    await db
      .insert(schema.metaCache)
      .values({
        url: normalized,
        title: meta.title,
        description: meta.description,
        logoUrl: meta.logoUrl,
        faviconUrl: meta.faviconUrl,
      })
      .onConflictDoUpdate({
        target: schema.metaCache.url,
        set: {
          title: meta.title,
          description: meta.description,
          logoUrl: meta.logoUrl,
          faviconUrl: meta.faviconUrl,
          fetchedAt: new Date(),
        },
      });
  } catch {
    /* ignore cache write failures */
  }

  return NextResponse.json({ ...meta, url: normalized, existingBidCents });
}
