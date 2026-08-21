import { Polar } from "@polar-sh/sdk";

/**
 * Polar.sh payment client.
 *
 * Replaces Stripe. Polar handles checkout, webhooks, and refunds.
 * You need:
 *   1. POLAR_ACCESS_TOKEN — org access token from Polar dashboard
 *   2. POLAR_PRODUCT_ID — a product you create in Polar (can be a generic
 *      "Distribution Bid" product; the actual amount is set per-checkout
 *      via ad-hoc pricing)
 *   3. POLAR_WEBHOOK_SECRET — webhook signing secret
 */

const accessToken = process.env.POLAR_ACCESS_TOKEN;
const productId = process.env.POLAR_PRODUCT_ID;

/** Sandbox or production? Defaults safely to sandbox. */
export const POLAR_ENV: "sandbox" | "production" =
  process.env.POLAR_ENV === "production" ? "production" : "sandbox";

let _polar: Polar | null = null;

export function polar(): Polar {
  if (!_polar) {
    if (!accessToken) {
      throw new Error("POLAR_ACCESS_TOKEN is not set.");
    }
    _polar = new Polar({ accessToken, server: POLAR_ENV });
  }
  return _polar;
}

export function polarProductId(): string {
  if (!productId) {
    throw new Error("POLAR_PRODUCT_ID is not set. Create a product in Polar.");
  }
  return productId;
}

export const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;
