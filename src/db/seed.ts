import { db, schema } from "./index";
import { nanoid } from "nanoid";
import { sql } from "drizzle-orm";

/**
 * Seed data for local development.
 *
 * These are REALISTIC numbers for a site that just launched:
 * small bids ($1-$15), few clicks, zero fake hype.
 *
 * Wipe before launch: `docker exec distributor-pg psql -U distributor -d distributor -c "delete from clicks; delete from bid_events; delete from listings; delete from meta_cache;"`
 */
const SEED = [
  {
    url: "https://cursor.com",
    name: "Cursor",
    description: "The AI code editor built to make you more productive.",
    category: "Developer Tools",
    bid: 15,
    clicks: 3,
  },
  {
    url: "https://linear.app",
    name: "Linear",
    description: "The issue tracking tool you'll enjoy using.",
    category: "Productivity",
    bid: 12,
    clicks: 2,
  },
  {
    url: "https://vercel.com",
    name: "Vercel",
    description: "Build and deploy the web.",
    category: "Infrastructure",
    bid: 10,
    clicks: 2,
  },
  {
    url: "https://supabase.com",
    name: "Supabase",
    description: "The open-source Firebase alternative.",
    category: "Infrastructure",
    bid: 8,
    clicks: 1,
  },
  {
    url: "https://resend.com",
    name: "Resend",
    description: "The email API for developers.",
    category: "Developer Tools",
    bid: 5,
    clicks: 1,
  },
  {
    url: "https://cal.com",
    name: "Cal.com",
    description: "Scheduling infrastructure for everyone.",
    category: "Productivity",
    bid: 3,
    clicks: 0,
  },
  {
    url: "https://shadcn.com",
    name: "shadcn/ui",
    description: "Beautifully designed components built with Radix UI and Tailwind.",
    category: "Developer Tools",
    bid: 2,
    clicks: 0,
  },
  {
    url: "https://drizzle-team.com",
    name: "Drizzle ORM",
    description: "Headless TypeScript ORM with a head.",
    category: "Developer Tools",
    bid: 1,
    clicks: 0,
  },
];

async function main() {
  console.log("Seeding…");
  for (const s of SEED) {
    const id = nanoid(12);
    const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await db
      .insert(schema.listings)
      .values({
        id,
        slug,
        url: s.url,
        name: s.name,
        description: s.description,
        category: s.category,
        currentBidCents: s.bid * 100,
        totalPaidCents: s.bid * 100,
        verifiedClicks: s.clicks,
        rawClicks: Math.round(s.clicks * 1.2),
        status: "active",
        goal: "traffic",
      })
      .onConflictDoNothing();
    await db
      .insert(schema.bidEvents)
      .values({
        id: nanoid(12),
        listingId: id,
        amountCents: s.bid * 100,
        resultingBidCents: s.bid * 100,
        ownerEmail: "seed@distributor.lol",
      })
      .onConflictDoNothing();
  }
  const count = await db.select({ c: sql<number>`count(*)` }).from(schema.listings);
  console.log(`Done. ${count[0]?.c} listings in DB.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
