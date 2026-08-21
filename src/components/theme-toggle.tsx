"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

// Subscribe to next-themes without triggering the lint error for setState-in-effect.
function useResolvedTheme() {
  const { resolvedTheme } = useTheme();
  return useSyncExternalStore(
    () => () => {},
    () => resolvedTheme ?? "light",
    () => "light",
  );
}

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
