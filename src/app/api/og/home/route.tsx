import { ImageResponse } from "next/og";
import { getLeaderboardStats } from "@/lib/queries";
import { formatUsd, formatCompact } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export async function GET() {
  const stats = await getLeaderboardStats();

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
          <span>The distribution market</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "72px",
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: "900px",
            }}
          >
            <div style={{ display: "flex" }}>Put money in.</div>
            <div style={{ display: "flex" }}>Get measurable attention out.</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              color: "#a1a1aa",
              marginTop: "24px",
              maxWidth: "800px",
            }}
          >
            A live leaderboard where every dollar is actually put to work.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "48px",
            borderTop: "1px solid #27272a",
            paddingTop: "32px",
          }}
        >
          <Metric
            label="Distributed"
            value={formatUsd(stats.totalDistributed)}
            accent
          />
          <Metric
            label="Active listings"
            value={String(stats.listingCount)}
          />
          <Metric
            label="Verified clicks"
            value={formatCompact(stats.totalVerifiedClicks)}
          />
          <Metric
            label="Unique visitors"
            value={formatCompact(stats.uniqueVisitors)}
          />
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
          display: "flex",
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
          display: "flex",
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
