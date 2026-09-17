import { cn } from "cn";

/**
 * Hex nut mark. Hardware, not a generic abstract swoosh.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-7", className)}
      fill="none"
    >
      <path
        d="M12 1.6 20.5 6.6v10L12 21.6 3.5 16.6v-10L12 1.6Z"
        className="fill-primary"
      />
      <circle cx="12" cy="11.6" r="3.6" className="fill-background" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-heading text-foreground text-xl leading-none font-extrabold tracking-tight",
        className,
      )}
    >
      FixIt
      <span className="bg-accent text-accent-foreground ml-0.5 inline-block px-1">
        PH
      </span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <Wordmark />
    </span>
  );
}
