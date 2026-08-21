import { redirect } from "next/navigation";
import { clearAdminCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  await clearAdminCookie();
  redirect("/admin/login");
}
