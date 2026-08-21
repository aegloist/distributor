import Link from "next/link";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { desc, sql } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { AdminTable } from "@/components/admin-table";
import { Button } from "@/components/ui/button";
import { formatUsd, formatCompact } from "@/lib/utils";
import { LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const [listings, [stats], recentClicks] = await Promise.all([
    db
      .select()
      .from(schema.listings)
      .orderBy(desc(schema.listings.currentBidCents))
      .limit(200),
    db
      .select({
        totalDistributed: sql<number>`coalesce(sum(${schema.listings.totalPaidCents}),0)`,
        totalClicks: sql<number>`coalesce(sum(${schema.listings.verifiedClicks}),0)`,
        totalRaw: sql<number>`coalesce(sum(${schema.listings.rawClicks}),0)`,
        count: sql<number>`count(*)`,
      })
      .from(schema.listings),
    db
      .select({
        id: schema.clicks.id,
        listingId: schema.clicks.listingId,
        isBot: schema.clicks.isBot,
        isVerified: schema.clicks.isVerified,
        fraudScore: schema.clicks.fraudScore,
        createdAt: schema.clicks.createdAt,
      })
      .from(schema.clicks)
      .orderBy(desc(schema.clicks.createdAt))
      .limit(50),
  ]);

  const listingById = new Map(listings.map((l) => [l.id, l]));
  const botClicks = recentClicks.filter((c) => c.isBot).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Manage listings, refunds and moderation.
          </p>
        </div>
        <form action="/api/admin/logout" method="post">
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </form>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        <Cell label="Gross distributed" value={formatUsd(Number(stats?.totalDistributed ?? 0))} accent />
        <Cell label="Verified clicks" value={formatCompact(Number(stats?.totalClicks ?? 0))} />
        <Cell label="Listings" value={String(stats?.count ?? 0)} />
        <Cell
          label="Bot clicks (last 50)"
          value={`${botClicks}/${recentClicks.length}`}
        />
      </div>

      {/* Listings table */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Listings</h2>
        <AdminTable listings={listings} />
      </div>

      {/* Recent clicks (fraud monitor) */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Recent clicks (fraud monitor)</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Listing</th>
                <th className="px-3 py-2 font-medium">Verdict</th>
                <th className="px-3 py-2 font-medium">Fraud score</th>
                <th className="px-3 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {recentClicks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    No clicks recorded yet.
                  </td>
                </tr>
              )}
              {recentClicks.map((c) => {
                const l = listingById.get(c.listingId);
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2">
                      {l ? (
                        <Link
                          href={`/l/${l.slug}`}
                          className="hover:underline"
                        >
                          {l.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">deleted</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {c.isBot ? (
                        <span className="text-destructive">bot</span>
                      ) : c.isVerified ? (
                        <span className="text-success">verified</span>
                      ) : (
                        <span className="text-warning">duplicate</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono tnum">{c.fraudScore}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(c.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-xl font-bold tnum ${
          accent ? "text-accent-text" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
