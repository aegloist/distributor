CREATE TYPE "public"."campaign_goal" AS ENUM('traffic', 'signups', 'customers', 'awareness');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'refunded', 'banned', 'pending');--> statement-breakpoint
CREATE TABLE "bid_events" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"resulting_bid_cents" integer NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_checkout_session_id" text,
	"owner_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clicks" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"visitor_hash" text NOT NULL,
	"user_agent" text,
	"referer" text,
	"country" text,
	"is_bot" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"fraud_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo_url" text,
	"favicon_url" text,
	"category" text,
	"goal" "campaign_goal" DEFAULT 'traffic',
	"current_bid_cents" integer DEFAULT 0 NOT NULL,
	"total_paid_cents" integer DEFAULT 0 NOT NULL,
	"verified_clicks" bigint DEFAULT 0 NOT NULL,
	"raw_clicks" bigint DEFAULT 0 NOT NULL,
	"owner_email" text,
	"stripe_customer_id" text,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "meta_cache" (
	"url" text PRIMARY KEY NOT NULL,
	"title" text,
	"description" text,
	"logo_url" text,
	"favicon_url" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bid_events" ADD CONSTRAINT "bid_events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bid_events_listing_idx" ON "bid_events" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "bid_events_pi_idx" ON "bid_events" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "clicks_listing_idx" ON "clicks" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "clicks_visitor_idx" ON "clicks" USING btree ("visitor_hash");--> statement-breakpoint
CREATE INDEX "clicks_created_idx" ON "clicks" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_slug_idx" ON "listings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "listings_rank_idx" ON "listings" USING btree ("current_bid_cents");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");