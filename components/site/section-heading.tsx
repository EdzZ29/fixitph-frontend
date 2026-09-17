import type { ReactNode } from "react";
import { cn } from "cn";

/**
 * Shared section heading. Title plus a lead sentence, no eyebrow label.
 */
export function SectionHeading({
  id,
  title,
  lead,
  action,
  className,
}: {
  id?: string;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        <h2
          id={id}
          className="text-3xl font-extrabold text-balance sm:text-4xl"
        >
          {title}
        </h2>
        {lead ? (
          <p className="text-muted-foreground mt-3 text-base leading-relaxed sm:text-lg">
            {lead}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
