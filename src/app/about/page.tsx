import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">About</h1>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          <span className="text-foreground">Distributor.lol</span> is a
          leaderboard for startups, priced by whoever wants the attention most.
          Every position is bought. The highest bid sits at #1 until somebody
          pays more.
        </p>
        <p>
          There is no editorial team, no application form and no &quot;best startups
          of 2026&quot; listicle logic behind it. You pay, you are on the board, your
          bid decides the spot. If somebody outbids you, you either let it go or
          you top up. That is the whole game.
        </p>
        <p>
          It is a side project, openly inspired by{" "}
          <Link
            href="https://outbid.lol"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent-text underline-offset-2 hover:underline"
          >
            outbid.lol
          </Link>{" "}
          and{" "}
          <Link
            href="https://topseos.lol"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent-text underline-offset-2 hover:underline"
          >
            topseos.lol
          </Link>{" "}
          - same idea, except this one is for the startup crowd: founders, indie
          hackers, dev tools, SaaS products, open source projects, and the
          people behind them.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Why startups specifically
        </h2>
        <p>
          Because every founder is already paying for attention somewhere: ads,
          sponsorships, directories, launch platforms. This is that same
          purchase with the price tag visible and the results tracked. No
          monthly fee, no API keys, no revenue share. One payment, one rank, one
          tracked click counter.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Who built it
        </h2>
        <p>
          <Link
            href="https://x.com/aegloist"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent-text underline-offset-2 hover:underline"
          >
            Tanay
          </Link>{" "}
          - builds things on the internet. DMs are open if you want to argue
          about the pricing.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-foreground">
          Questions people keep asking
        </h2>

        <p className="font-medium text-foreground">Do I get a backlink?</p>
        <p>
          Every listing gets its own public page here. Visits to the listed site
          use the same tracked redirect everywhere so the verified click counter
          stays accurate.
        </p>

        <p className="font-medium text-foreground">Can I get a refund?</p>
        <p>
          No. A bid buys a position on a public board the moment it clears;
          there is nothing to give back. Read the rules first.
        </p>

        <p className="font-medium text-foreground">Do I get an invoice?</p>
        <p>
          Yes. Polar emails a receipt and an invoice to the address you enter at
          checkout.
        </p>
      </div>

      <div className="mt-8">
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          ← Back to the leaderboard
        </Link>
      </div>
    </div>
  );
}
