import { ImageResponse } from "next/og";
import { getListingBySlug, getRankOf } from "@/lib/queries";
import { formatUsd, formatCompact, hostnameOf } from "@/lib/utils";

export const runtime = "nodejs";
export const revalidate = 60;
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const listing = await getListingBySlug(slug);
  if (!listing) {
    return new Response("Not found", { status: 404 });
  }
  const rank = await getRankOf(listing);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0b",
          color: "#fafafa",
          padding: "64px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "#a3e635",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "20px",
            color: "#a1a1aa",
          }}
        >
          <span style={{ color: "#a3e635", fontWeight: 700 }}>
            distributor.lol
          </span>
          <span>·</span>
          <span>#{rank} on the leaderboard</span>
        </div>

        <div style={{ display: "flex", marginTop: "32px", gap: "24px", flex: 1 }}>
          <div
            style={{
              width: "96px",
              height: "96px",
              borderRadius: "16px",
              background: "#27272a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: 700,
              color: "#a1a1aa",
              flexShrink: 0,
            }}
          >
            {listing.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: "56px", fontWeight: 800, lineHeight: 1.05 }}>
              {listing.name}
            </div>
            <div style={{ fontSize: "24px", color: "#a1a1aa", marginTop: "8px" }}>
              {hostnameOf(listing.url)}
            </div>
            {listing.description && (
              <div
                style={{
                  fontSize: "26px",
                  color: "#d4d4d8",
                  marginTop: "20px",
                  maxWidth: "780px",
                }}
              >
                {listing.description.slice(0, 140)}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "48px",
            marginTop: "auto",
            borderTop: "1px solid #27272a",
            paddingTop: "32px",
          }}
        >
          <Metric label="Current bid" value={formatUsd(listing.currentBidCents)} accent />
          <Metric label="Verified clicks" value={formatCompact(listing.verifiedClicks)} />
          <Metric label="Total paid" value={formatUsd(listing.totalPaidCents)} />
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontSize: "16px",
          color: "#a1a1aa",
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "40px",
          fontWeight: 800,
          fontFamily: "monospace",
          color: accent ? "#a3e635" : "#fafafa",
          marginTop: "4px",
        }}
      >
        {value}
      </div>
    </div>
  );
}
