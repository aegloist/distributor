export const dynamic = "force-static";

/** Keep the former OG endpoint working while serving the versioned static card. */
export function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  return Response.redirect(
    new URL("/distributor-og-v2.png", appUrl),
    302,
  );
}
