import {
  pgTable,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------- enums ----------

export const listingStatus = pgEnum("listing_status", [
  "active",
  "refunded",
  "banned",
  "pending",
]);

export const campaignGoal = pgEnum("campaign_goal", [
  "traffic",
  "signups",
  "customers",
  "awareness",
]);

// ---------- tables ----------

export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    url: text("url").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    faviconUrl: text("favicon_url"),
    category: text("category"),
    goal: campaignGoal("goal").default("traffic"),
    /** Current displayed bid in cents. Rank is determined by this. */
    currentBidCents: integer("current_bid_cents").notNull().default(0),
    /** Cumulative amount actually paid into this listing in cents. */
    totalPaidCents: integer("total_paid_cents").notNull().default(0),
    verifiedClicks: bigint("verified_clicks", { mode: "number" }).notNull().default(0),
    rawClicks: bigint("raw_clicks", { mode: "number" }).notNull().default(0),
    ownerEmail: text("owner_email"),
    stripeCustomerId: text("stripe_customer_id"),
    status: listingStatus("status").notNull().default("active"),
    /** Optional override for moderation (hide from leaderboard). */
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /** When the bid last changed. Used for ranking tie-breaks so clicks don't affect order. */
    bidUpdatedAt: timestamp("bid_updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("listings_slug_idx").on(t.slug),
    uniqueIndex("listings_url_idx").on(t.url),
    index("listings_rank_idx").on(t.currentBidCents),
    index("listings_status_idx").on(t.status),
  ],
);

export const bidEvents = pgTable(
  "bid_events",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    /** Amount of this individual payment in cents. */
    amountCents: integer("amount_cents").notNull(),
    /** The bid value after this payment (cumulative bid, not total paid). */
    resultingBidCents: integer("resulting_bid_cents").notNull(),
    /** Polar checkout ID. Legacy database column name retained to avoid a risky rename. */
    polarCheckoutId: text("stripe_payment_intent_id"),
    /** Polar order ID, used for refunds. Legacy database column name retained. */
    polarOrderId: text("stripe_checkout_session_id"),
    ownerEmail: text("owner_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bid_events_listing_idx").on(t.listingId),
    uniqueIndex("bid_events_checkout_idx").on(t.polarCheckoutId),
    index("bid_events_order_idx").on(t.polarOrderId),
  ],
);

export const refundEvents = pgTable(
  "refund_events",
  {
    /** Polar refund ID; primary key makes webhook processing idempotent. */
    id: text("id").primaryKey(),
    bidEventId: text("bid_event_id")
      .notNull()
      .references(() => bidEvents.id, { onDelete: "cascade" }),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("refund_events_bid_idx").on(t.bidEventId),
    index("refund_events_listing_idx").on(t.listingId),
  ],
);

export const clicks = pgTable(
  "clicks",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    /** sha256(ip + ua + salt) — never store raw IP. */
    visitorHash: text("visitor_hash").notNull(),
    userAgent: text("user_agent"),
    referer: text("referer"),
    country: text("country"),
    isBot: boolean("is_bot").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(false),
    fraudScore: integer("fraud_score").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("clicks_listing_idx").on(t.listingId),
    index("clicks_visitor_idx").on(t.visitorHash),
    index("clicks_created_idx").on(t.createdAt),
  ],
);

export const metaCache = pgTable(
  "meta_cache",
  {
    url: text("url").primaryKey(),
    title: text("title"),
    description: text("description"),
    logoUrl: text("logo_url"),
    faviconUrl: text("favicon_url"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type BidEvent = typeof bidEvents.$inferSelect;
export type Click = typeof clicks.$inferSelect;
export type RefundEvent = typeof refundEvents.$inferSelect;
