CREATE TABLE "refund_events" (
	"id" text PRIMARY KEY NOT NULL,
	"bid_event_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "bid_events_pi_idx";--> statement-breakpoint
ALTER TABLE "refund_events" ADD CONSTRAINT "refund_events_bid_event_id_bid_events_id_fk" FOREIGN KEY ("bid_event_id") REFERENCES "public"."bid_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_events" ADD CONSTRAINT "refund_events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refund_events_bid_idx" ON "refund_events" USING btree ("bid_event_id");--> statement-breakpoint
CREATE INDEX "refund_events_listing_idx" ON "refund_events" USING btree ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bid_events_checkout_idx" ON "bid_events" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "bid_events_order_idx" ON "bid_events" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_url_idx" ON "listings" USING btree ("url");