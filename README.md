# distributor.lol

The distribution market. A live leaderboard where every dollar is put to work — submit a startup, bid for rank, get verified traffic.

> We do not sell rankings. We sell measurable attention.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Tailwind CSS v4** + shadcn-style primitives (Radix UI)
- **Drizzle ORM** + **Postgres**
- **Polar** (payments, signed webhooks, receipts, and refunds)
- **Upstash Redis** (rate limiting — optional in dev)
- **Vercel Analytics** + **Speed Insights**
- **next/og** (dynamic shareable OG cards)

## Quick start

### 1. Database

A Docker Postgres is the easiest local option:

```bash
docker run -d --name distributor-pg \
  -e POSTGRES_PASSWORD=distributor \
  -e POSTGRES_USER=distributor \
  -e POSTGRES_DB=distributor \
  -p 5433:5432 pgvector/pgvector:pg16
```

Or point `DATABASE_URL` at Neon / Supabase / RDS.

### 2. Env

```bash
cp .env.example .env.local
# fill in the Polar product, access-token, and webhook settings
```

### 3. Migrate + seed

```bash
pnpm install
DATABASE_URL=postgres://distributor:distributor@localhost:5433/distributor pnpm db:migrate
pnpm db:seed   # optional: 8 demo listings
```

### 4. Run

```bash
pnpm dev
```

Open http://localhost:3000.

## Polar webhooks

In the Polar sandbox dashboard, create a webhook endpoint pointing at your
publicly reachable `/api/webhook` route. Subscribe to `order.paid`,
`refund.created`, and `refund.updated`, then put its signing secret in
`POLAR_WEBHOOK_SECRET`. Repeat this with a production endpoint and production
credentials before launch.

## How it works

| Flow | What happens |
| --- | --- |
| Submit | Paste URL → type a bid → see "Claim #X for $Y" live → Polar checkout |
| New listing | Webhook uses fresh server-fetched metadata (or safely refetches it), creates the listing at the paid bid, ranked immediately |
| Bid increase | Same URL again → pay only the difference → bid jumps to the new amount |
| Ranking | Pure bid-based. Higher bid = higher rank. $21 beats $20 beats $19. No votes, no algorithms. |
| Clicks | Every outbound hit goes through `/r/[slug]` → bot detection + dedup + fraud score → only verified humans increment the visible counter |
| Refunds | Admin refunds via Polar → a successful refund webhook lowers the bid exactly once |
| Sharing | Each listing has a dynamic OG image at `/api/og/[slug]` for screenshot-worthy cards |

## Click integrity

Raw counters are trivial to manipulate, so we:

- hash `ip + ua + salt` (never store raw IPs)
- detect bots/crawlers/link-previewers by UA + `Accept` header
- dedup by visitor hash within a 30-minute window per listing
- distinguish **raw clicks** from **verified clicks** — only verified humans move the public number

## Admin

- `/admin/login` — password from the required `ADMIN_PASSWORD` environment variable
- `/admin` — hide/unhide, ban/unban, refund latest payment, fraud monitor

## Project structure

```
src/
  app/
    page.tsx              # homepage: hero + submit + live leaderboard
    l/[slug]/page.tsx     # public listing page
    r/[slug]/route.ts     # tracked redirect (click integrity)
    rules/ about/ admin/
    api/
      metadata/           # OG fetch + cache
      checkout/           # Polar checkout session and fulfillment status
      webhook/            # transactional, idempotent Polar fulfillment
      bids/               # all current bids (for live rank preview)
      leaderboard/        # live refresh
      og/[slug]/          # dynamic OG image
      admin/              # login/logout/listing actions
  db/                     # drizzle schema + client + seed
  lib/                    # Polar, Redis, fraud, metadata, auth, queries, utils
  components/             # UI primitives + feature components
```

## Roadmap (intentionally deferred from V0)

The full vision is a four-layer business. V0 ships the viral leaderboard layer with honest click tracking. Next:

1. **Managed distribution** — "$299 distribute everywhere" packs, fulfilled manually at first
2. **Marketplace** — onboard X creators + newsletters as supply
3. **Performance router** — CPC/CPA routing backed by per-channel performance data (the real moat)

## Scripts

| Command | What |
| --- | --- |
| `pnpm dev` | dev server |
| `pnpm build` | production build |
| `pnpm env:check` | validate local configuration without printing secrets |
| `pnpm env:check:production` | validate production launch configuration |
| `pnpm polar:check` | verify the configured Polar token and product |
| `pnpm db:generate` | generate Drizzle migration from schema changes |
| `pnpm db:migrate` | apply migrations |
| `pnpm db:studio` | Drizzle Studio (DB browser) |
| `pnpm db:seed` | insert demo listings |
