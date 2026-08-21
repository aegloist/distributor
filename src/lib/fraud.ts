import { createHash } from "node:crypto";

/**
 * Click integrity layer.
 *
 * Lessons from the clone operators (cited in the plan):
 *  - raw click counters are trivial to manipulate (rotate a cookie -> fake clicks)
 *  - dedup by hashed network identity + time window
 *  - filter automated traffic (mail scanners, bots, link previewers)
 *  - distinguish raw clicks from verified human clicks
 *
 * We never store raw IPs. We hash ip+ua+salt.
 */

const SALT = process.env.CLICK_SALT ?? "distributor-lol-change-me";

/** Hash an IP + UA into a stable, non-reversible visitor id. */
export function visitorHash(ip: string, ua: string): string {
  return createHash("sha256")
    .update(`${SALT}|${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32);
}

/** Get the "real" client IP from common proxy headers. */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  // Vercel / Cloudflare convention
  const cfConnecting = headers.get("cf-connecting-ip");
  if (cfConnecting) return cfConnecting;
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "0.0.0.0";
}

const BOT_PATTERNS = [
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /scan/i,
  /preview/i,
  /fetch/i,
  /curl/i,
  /wget/i,
  /httpx/i,
  /python-requests/i,
  /node-fetch/i,
  /axios/i,
  /go-http-client/i,
  /java\//i,
  /okhttp/i,
  /headless/i,
  /phantom/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /googlebot/i,
  /bingbot/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /slackbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /discordbot/i,
  /applebot/i,
  /bytespider/i,
  /ai2bot/i,
  /claudebot/i,
  /gptbot/i,
  /oai-searchbot/i,
  /perplexity/i,
  /imagesift/i,
  /archive\.org/i,
  /wayback/i,
];

/** Is this user-agent an obvious bot / crawler / link previewer? */
export function isBotUa(ua: string | null | undefined): boolean {
  if (!ua) return true;
  if (ua.trim().length === 0) return true;
  return BOT_PATTERNS.some((p) => p.test(ua));
}

/** A request with no Accept: text/html is almost certainly not a real browser. */
export function looksLikeNonBrowser(req: Request): boolean {
  const accept = req.headers.get("accept") ?? "";
  if (!accept) return true;
  if (!accept.includes("text/html") && !accept.includes("application/xhtml")) {
    return true;
  }
  return false;
}

export interface FraudVerdict {
  isBot: boolean;
  isVerified: boolean;
  fraudScore: number; // 0..100
}

/**
 * Score a click. Verified = a real-looking browser hit we haven't seen
 * from this visitor for this listing in the dedup window.
 */
export function scoreClick(opts: {
  ua: string | null;
  isNonBrowser: boolean;
  /** True if we found a recent duplicate click for this listing+visitor. */
  isDuplicate: boolean;
}): FraudVerdict {
  const bot = isBotUa(opts.ua) || opts.isNonBrowser;
  let score = 0;
  if (bot) score += 80;
  if (opts.isDuplicate) score += 40;
  if (score > 100) score = 100;
  const isVerified = !bot && !opts.isDuplicate;
  return { isBot: bot, isVerified, fraudScore: score };
}

/** Dedup window: same visitor + same listing within this window = duplicate. */
export const DEDUP_WINDOW_MS = 1000 * 60 * 30; // 30 min
