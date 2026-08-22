export const dynamic = "force-static";

/** Keep the former OG endpoint working while serving the versioned static card. */
export function GET(request: Request) {
  return Response.redirect(
    new URL("/distributor-og-v1.png", request.url),
    302,
  );
}
