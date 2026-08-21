import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Rules" };

export default function RulesPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Rules</h1>
      <p className="mt-2 text-muted-foreground">
        Short version: pay more than the person above you and you go above them.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <Section title="How ranking works">
          <ul className="mt-2 space-y-2 text-muted-foreground">
            <li>
              Bids start at $1 and move in whole $1 steps.
            </li>
            <li>
              The board is sorted by amount, highest first. Pay less than #1 and
              you still get listed, just further down.
            </li>
            <li>
              Equal bids are ordered by how recently they were placed, freshest
              on top. Match the price above you and you take that spot, until
              somebody matches yours.
            </li>
            <li>
              Submitting a URL that is already on the board is a top-up, not a
              second listing: you pay only the difference between your old bid
              and your new one.
            </li>
            <li>
              Ranks update the moment Polar confirms the payment.
            </li>
          </ul>
        </Section>

        <Section title="How your listing is built">
          <ul className="mt-2 space-y-2 text-muted-foreground">
            <li>
              The name, description and icon are pulled automatically from your
              site the moment you type your URL, from its Open Graph tags, title
              tag, meta description and favicon.
            </li>
            <li>
              So whatever your homepage says about you is what the board will say
              about you. Fix your meta tags before you bid.
            </li>
            <li>
              Something wrong or out of date? Message{" "}
              <Link
                href="https://x.com/aegloist"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent-text underline-offset-2 hover:underline"
              >
                Tanay
              </Link>{" "}
              and it gets corrected.
            </li>
          </ul>
        </Section>

        <Section title="What you can list">
          <ul className="mt-2 space-y-2 text-muted-foreground">
            <li>
              Startups, SaaS products, dev tools, apps, open-source projects,
              newsletters, and the personal sites or portfolios of people who
              build things.
            </li>
            <li>
              One listing per canonical URL. Different product, repository or
              profile paths can be listed separately.
            </li>
            <li>
              Group chat invites are out: Telegram, WhatsApp, Discord, Messenger,
              Signal and anything similar.
            </li>
            <li>
              No adult content, no malware, no scams, nothing illegal.
            </li>
            <li>
              Common advertising and tracking parameters are stripped from your
              URL before it is listed.
            </li>
          </ul>
        </Section>

        <Section title="After you pay">
          <ul className="mt-2 space-y-2 text-muted-foreground">
            <li>
              Your listing goes live publicly, with a clickable, tracked link and
              a live click counter.
            </li>
            <li>
              You also get your own listing page on distributor.lol: icon,
              description, stats and a direct followable link to your site.
            </li>
            <li>
              The board shows how long ago each listing last changed its bid.
            </li>
            <li>
              Polar sends the receipt and invoice to the email you enter at
              checkout. We retain that email with the bid for accounting and
              support.
            </li>
            <li>
              For click integrity, we retain a salted hash derived from IP and
              browser user agent, plus the user agent and referring page. Raw IP
              addresses are never stored in our database.
            </li>
            <li>
              Sales are final when somebody outbids you. Exceptions may still be
              made where required by law, for fraud or service failures, or by
              Polar under its payment and chargeback policies.
            </li>
            <li>
              Anything that breaks these rules is removed without a refund.
            </li>
          </ul>
        </Section>
      </div>

      <div className="mt-10">
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}
