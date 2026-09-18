import Image from "next/image";
import { cn } from "cn";

/**
 * The FixItPH logo, from the supplied artwork.
 *
 * Two files rather than one recoloured file. The lockup is not a single-tint
 * shape — "PH" sits in a lime box that stays lime on both themes, while the
 * hex mark and "FixIt" invert — so there is no filter that turns one into the
 * other, and the artwork ships in both colourways for exactly that reason.
 *
 * Which one shows is decided in CSS rather than by reading the theme in
 * React. next-themes settles after hydration, so a component that picked the
 * file itself would render the light logo first and swap it on a dark page,
 * visibly, on every single load. `hidden` also drops the unused one from the
 * accessibility tree, so the name is announced once.
 *
 * The files under public/brand are derived from public/img, trimmed to the
 * ink and sized for the header — the originals are 4167px squares that are
 * mostly transparent, and would render as a speck in a large empty box.
 */

/** Intrinsic size of the trimmed lockup, for the aspect ratio. */
const LOCKUP = { width: 402, height: 96 };

/** The hex mark on its own. Taller than it is wide. */
const MARK = { width: 83, height: 96 };

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative block h-7 w-[24px] shrink-0", className)}>
      <Image
        src="/brand/mark-dark.png"
        alt=""
        {...MARK}
        className="block h-full w-auto dark:hidden"
      />
      <Image
        src="/brand/mark-light.png"
        alt=""
        {...MARK}
        className="hidden h-full w-auto dark:block"
      />
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center", className)}>
      <Image
        src="/brand/lockup-dark.png"
        alt="FixItPH"
        {...LOCKUP}
        priority
        className="block h-7 w-auto dark:hidden"
      />
      <Image
        src="/brand/lockup-light.png"
        alt="FixItPH"
        {...LOCKUP}
        priority
        className="hidden h-7 w-auto dark:block"
      />
    </span>
  );
}
