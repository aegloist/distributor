import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isObviouslyPrivateHostname, normalizePublicUrl } from "./utils";

export interface FetchedMeta {
  title: string | null;
  description: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
}

const INTERSTITIAL_TITLE =
  /^(just a moment|attention required|checking your browser|verifying you are human|security check|access denied)\b/i;

/** Only durable, page-specific metadata belongs in the 24-hour cache. */
export function isUsableMetadata(meta: FetchedMeta, sourceUrl: string): boolean {
  const title = meta.title?.trim() ?? "";
  if (INTERSTITIAL_TITLE.test(title)) return false;
  const sourceHost = hostname(sourceUrl).toLowerCase();
  return (
    !!meta.description ||
    !!meta.logoUrl ||
    (!!title && title.toLowerCase() !== sourceHost)
  );
}

/**
 * Fetch a URL and parse OpenGraph / oEmbed-style metadata.
 * Server-side only. Time-boxed to 5s. Follows redirects.
 */
export async function fetchMeta(rawUrl: string): Promise<FetchedMeta> {
  const url = normalizePublicUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const candidates = metadataCandidates(url);
    return await Promise.any(
      candidates.map((candidate) =>
        fetchMetadataCandidate(candidate, controller.signal),
      ),
    );
  } catch {
    return fallbackMeta(url);
  } finally {
    controller.abort();
    clearTimeout(timeout);
  }
}

/**
 * Root domains commonly redirect to www. Trying the safe www form in parallel
 * avoids spending the whole function budget on a slow redirect chain.
 */
function metadataCandidates(url: string): string[] {
  const parsed = new URL(url);
  const labels = parsed.hostname.split(".");
  if (
    labels.length === 2 &&
    !parsed.hostname.startsWith("www.") &&
    !isIP(parsed.hostname)
  ) {
    const www = new URL(parsed);
    www.hostname = `www.${parsed.hostname}`;
    return [url, www.toString()];
  }
  return [url];
}

async function fetchMetadataCandidate(
  url: string,
  signal: AbortSignal,
): Promise<FetchedMeta> {
  const { res, finalUrl } = await fetchWithSafeRedirects(url, signal);

  if (!res.ok || res.headers.get("cf-mitigated") === "challenge") {
    throw new Error("Metadata destination returned an interstitial or error page.");
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("xml")) {
    throw new Error("Metadata destination is not an HTML page.");
  }

  const html = await readLimitedText(res, 1_000_000);
  const parsed = parseHtml(html, finalUrl);
  if (!isUsableMetadata(parsed, finalUrl)) {
    throw new Error("Metadata destination did not expose usable metadata.");
  }
  return parsed;
}

function fallbackMeta(url: string): FetchedMeta {
  return {
    title: hostname(url),
    description: null,
    logoUrl: null,
    faviconUrl: faviconFor(url),
  };
}

async function fetchWithSafeRedirects(
  initialUrl: string,
  signal: AbortSignal,
): Promise<{ res: Response; finalUrl: string }> {
  let current = initialUrl;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    await assertPublicDestination(current);
    const res = await fetch(current, {
      signal,
      redirect: "manual",
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (res.status < 300 || res.status >= 400) {
      return { res, finalUrl: current };
    }

    const location = res.headers.get("location");
    if (!location) throw new Error("Redirect response had no destination.");
    current = normalizePublicUrl(new URL(location, current).toString());
  }
  throw new Error("Too many redirects.");
}

async function assertPublicDestination(rawUrl: string) {
  const { hostname } = new URL(rawUrl);
  if (isObviouslyPrivateHostname(hostname)) throw new Error("Private URL blocked.");

  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private URL blocked.");
  }
}

function isPrivateAddress(address: string): boolean {
  if (isObviouslyPrivateHostname(address)) return true;
  const value = address.toLowerCase();
  return (
    value === "::" ||
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb") ||
    value.startsWith("::ffff:127.") ||
    value.startsWith("::ffff:10.") ||
    value.startsWith("::ffff:192.168.")
  );
}

async function readLimitedText(res: Response, maxBytes: number): Promise<string> {
  const declaredLength = Number(res.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) throw new Error("Metadata response is too large.");
  if (!res.body) return "";

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let output = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("Metadata response is too large.");
    }
    output += decoder.decode(value, { stream: true });
  }
  return output + decoder.decode();
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function faviconFor(url: string): string | null {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return null;
  }
}

function resolveUrl(maybeUrl: string, base: string): string | null {
  try {
    const resolved = new URL(maybeUrl, base);
    return resolved.protocol === "http:" || resolved.protocol === "https:"
      ? normalizePublicUrl(resolved.toString())
      : null;
  } catch {
    return null;
  }
}

function pickMeta(html: string, finalUrl: string): FetchedMeta {
  const get = (re: RegExp): string | null => {
    const m = html.match(re);
    if (!m) return null;
    const v = m[1]?.trim();
    return v && v.length > 0 ? v : null;
  };

  // og:title > twitter:title > <title>
  const title =
    get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ??
    get(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ??
    get(/<title[^>]*>([^<]+)<\/title>/i);

  const description =
    get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ??
    get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    get(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i);

  const ogImage =
    get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
    get(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

  // favicon: try apple-touch-icon (always square, best for avatars), then icon link
  const appleIcon =
    get(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i) ??
    get(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i);
  const faviconLink =
    get(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i) ??
    get(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);

  const faviconUrl = appleIcon
    ? resolveUrl(appleIcon, finalUrl)
    : faviconLink
      ? resolveUrl(faviconLink, finalUrl)
      : faviconFor(finalUrl);

  // For the logo/avatar, prefer apple-touch-icon (square) over og:image (often wide banner)
  // since we display it as a small square avatar in the leaderboard.
  const logoUrl = appleIcon
    ? resolveUrl(appleIcon, finalUrl)
    : ogImage
      ? resolveUrl(ogImage, finalUrl)
      : null;

  return {
    title: title ? decodeEntities(title) : null,
    description: description ? decodeEntities(description) : null,
    logoUrl,
    faviconUrl,
  };
}

function parseHtml(html: string, finalUrl: string): FetchedMeta {
  // Extract JSON-LD blocks BEFORE stripping scripts
  const jsonLd = extractJsonLd(html, finalUrl);

  // strip <script> and <style> blocks to avoid false matches inside them
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  const meta = pickMeta(cleaned, finalUrl);

  // JSON-LD fills gaps where meta tags are missing
  if (jsonLd) {
    return {
      title: meta.title ?? jsonLd.title ?? null,
      description: meta.description ?? jsonLd.description ?? null,
      logoUrl: meta.logoUrl ?? jsonLd.logoUrl ?? null,
      faviconUrl: meta.faviconUrl,
    };
  }
  return meta;
}

/** Parse <script type="application/ld+json"> blocks for Schema.org data. */
function extractJsonLd(html: string, baseUrl: string): {
  title: string | null;
  description: string | null;
  logoUrl: string | null;
} | null {
  const blocks: string[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    blocks.push(m[1]);
  }
  if (blocks.length === 0) return null;

  for (const block of blocks) {
    try {
      const data = JSON.parse(block);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        // Handle @graph arrays
        const candidates = item["@graph"] && Array.isArray(item["@graph"]) ? item["@graph"] : [item];
        for (const node of candidates) {
          if (typeof node !== "object" || node === null) continue;
          const type = node["@type"];
          if (typeof type !== "string") continue;
          if (type !== "Organization" && type !== "SoftwareApplication" && type !== "WebSite" && type !== "Product") {
            continue;
          }
          const title = typeof node.name === "string" ? node.name : null;
          const description = typeof node.description === "string" ? node.description : null;
          let logoUrl: string | null = null;
          if (node.logo) {
            const logo = Array.isArray(node.logo) ? node.logo[0] : node.logo;
            if (typeof logo === "string") {
              logoUrl = logo;
            } else if (logo && typeof logo === "object" && typeof logo.url === "string") {
              logoUrl = logo.url;
            }
          }
          // Resolve logo URL against the page base URL, same as meta-tag images
          const resolvedLogo = logoUrl ? resolveUrl(logoUrl, baseUrl) : null;
          if (title || description || resolvedLogo) {
            return { title, description, logoUrl: resolvedLogo };
          }
        }
      }
    } catch {
      /* malformed JSON-LD, skip */
    }
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
