"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The visible state is driven entirely by the `dark` class on <html>, which
 * next-themes sets before first paint. That keeps the markup identical on the
 * server and the client, so there is no mismatch and no mounted flag.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-foreground size-9"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4.5 dark:hidden" aria-hidden />
      <Moon className="hidden size-4.5 dark:block" aria-hidden />
      <span className="sr-only dark:hidden">Switch to dark mode</span>
      <span className="sr-only hidden dark:inline">Switch to light mode</span>
    </Button>
  );
}
