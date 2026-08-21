import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Minimal admin auth for V0. Single shared secret in env, set as a cookie
 * after a password check. Good enough for one operator; replace with
 * NextAuth / Clerk when there are multiple admins.
 */

const ADMIN_COOKIE = "distributor_admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function matches(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

function sessionToken(password: string): string {
  return digest(`distributor-admin-session:${password}`).toString("hex");
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const c = store.get(ADMIN_COOKIE);
  return !!ADMIN_PASSWORD && !!c?.value && matches(c.value, sessionToken(ADMIN_PASSWORD));
}

export async function requireAdmin() {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }
}

export async function setAdminCookie(password: string): Promise<boolean> {
  if (!ADMIN_PASSWORD || !matches(password, ADMIN_PASSWORD)) return false;
  const store = await cookies();
  store.set(ADMIN_COOKIE, sessionToken(ADMIN_PASSWORD), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return true;
}

export function hasValidRequestOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin || !configured) return process.env.NODE_ENV !== "production";
  try {
    return new URL(origin).origin === new URL(configured).origin;
  } catch {
    return false;
  }
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
