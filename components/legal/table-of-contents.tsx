"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "cn";
import type { LegalSection } from "@/lib/legal/types";

/**
 * Sticky contents on desktop, a collapsed disclosure on mobile.
 *
 * On a phone a 35 item list above the document is just an obstacle, so it
 * starts closed and uses a native <details>, which is keyboard and screen
 * reader accessible without any JavaScript of its own.
 */
export function TableOfContents({
  sections,
  className,
}: {
  sections: LegalSection[];
  className?: string;
}) {
  const active = useActiveSection(sections.map((s) => s.id));

  return (
    <nav aria-label="On this page" className={cn("mb-10 lg:mb-0", className)}>
      {/* Mobile */}
      <details className="border-border bg-card rounded-lg border lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
          On this page
          <ChevronDown
            className="text-muted-foreground size-4 transition-transform [details[open]_&]:rotate-180"
            aria-hidden
          />
        </summary>
        <ol className="border-border text-muted-foreground max-h-80 overflow-y-auto border-t px-4 py-3 text-sm">
          {sections.map((section, i) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="hover:text-foreground block py-1.5"
              >
                <span className="tabular-nums">{i + 1}.</span> {section.title}
              </a>
            </li>
          ))}
        </ol>
      </details>

      {/* Desktop */}
      <div className="hidden lg:sticky lg:top-28 lg:block">
        <p className="text-muted-foreground mb-3 text-sm font-semibold">
          On this page
        </p>
        <ol className="border-border max-h-[calc(100dvh-12rem)] space-y-0.5 overflow-y-auto border-l text-sm">
          {sections.map((section, i) => {
            const isActive = active === section.id;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "-ml-px block border-l-2 py-1.5 pl-4 transition-colors",
                    isActive
                      ? "border-accent text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground border-transparent",
                  )}
                >
                  <span className="tabular-nums">{i + 1}.</span> {section.title}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

/**
 * Tracks which section is on screen. Uses IntersectionObserver rather than
 * scroll maths so it stays cheap, and degrades to no highlight if the browser
 * lacks it.
 */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Top-weighted band, so the heading you are reading wins rather than
      // whichever section happens to be tallest.
      { rootMargin: "-120px 0px -65% 0px", threshold: 0 },
    );

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
