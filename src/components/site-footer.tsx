import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
        <p>
          We do not sell rankings. We sell{" "}
          <span className="font-medium text-foreground">measurable attention.</span>
        </p>
        <div className="flex items-center gap-4">
          <Link href="/rules" className="hover:text-foreground transition-colors">
            Rules
          </Link>
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="/admin" className="hover:text-foreground transition-colors">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
