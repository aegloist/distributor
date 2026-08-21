import { NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/auth";
import { adminLoginLimiter, hasRedis } from "@/lib/redis";
import { getClientIp } from "@/lib/fraud";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (hasRedis && adminLoginLimiter) {
    try {
      const { success } = await adminLoginLimiter.limit(`login:${getClientIp(req)}`);
      if (!success) {
        return NextResponse.json(
          { error: "Too many login attempts. Try again later." },
          { status: 429 },
        );
      }
    } catch (error) {
      console.error("admin login rate limiter unavailable", error);
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { password } = body as { password?: string };
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }
  const ok = await setAdminCookie(password);
  if (!ok) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
