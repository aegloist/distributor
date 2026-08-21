import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center px-4 py-32 text-center">
      <p className="font-mono text-6xl font-bold text-accent-text">404</p>
      <h1 className="mt-4 text-xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This listing doesn&apos;t exist or was removed.
      </p>
      <Button asChild variant="accent" className="mt-6">
        <Link href="/">Back to the leaderboard</Link>
      </Button>
    </div>
  );
}
