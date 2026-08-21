import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await getLeaderboard(100);
  return NextResponse.json(
    { rows },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
