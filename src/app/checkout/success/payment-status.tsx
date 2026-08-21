"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export function PaymentStatus({ checkoutId }: { checkoutId: string }) {
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    if (!checkoutId) return;
    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      attempts += 1;
      try {
        const res = await fetch(
          `/api/checkout/status?checkoutId=${encodeURIComponent(checkoutId)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = (await res.json()) as { status: string; slug?: string };
          if (data.status === "fulfilled" && data.slug) {
            window.location.replace(`/l/${data.slug}?paid=1`);
            return;
          }
        }
      } catch {
        // Polar retries webhooks; keep checking without claiming failure.
      }

      if (!active) return;
      if (attempts >= 30) {
        setDelayed(true);
        return;
      }
      timer = setTimeout(check, 2000);
    };

    void check();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [checkoutId]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-16">
      <div className="w-full rounded-xl border border-border bg-card p-8 text-center">
        {delayed || !checkoutId ? (
          <CheckCircle2 className="mx-auto h-8 w-8 text-accent-text" />
        ) : (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent-text" />
        )}
        <h1 className="mt-4 text-xl font-semibold">
          {!checkoutId
            ? "Checkout reference missing"
            : delayed
              ? "Payment received"
              : "Confirming your listing"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {!checkoutId
            ? "Return to the checkout and try again. No payment status can be confirmed from this page."
            : delayed
            ? "Polar has your payment. Fulfillment is taking longer than usual; your receipt is safe and the webhook will retry automatically."
            : "This normally takes only a few seconds. Keep this page open and we’ll take you to the live listing."}
        </p>
        {(delayed || !checkoutId) && (
          <Link
            href="/"
            className="mt-5 inline-block text-sm font-medium text-accent-text hover:underline"
          >
            Return to the leaderboard
          </Link>
        )}
      </div>
    </div>
  );
}
