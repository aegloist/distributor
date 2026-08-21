"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center px-4 py-32 text-center">
      <p className="font-mono text-6xl font-bold text-destructive">500</p>
      <h1 className="mt-4 text-xl font-semibold">Something broke</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We logged it. Try again.
      </p>
      <Button variant="accent" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
