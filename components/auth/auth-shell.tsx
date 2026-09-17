import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeCheck, ReceiptText, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/site/logo";

const REASSURANCES = [
  {
    icon: BadgeCheck,
    title: "Verified providers",
    body: "Every listing shows a checked ID and the permit the trade requires.",
  },
  {
    icon: ReceiptText,
    title: "Rates before you commit",
    body: "Starting prices are posted, and the quote is fixed before you book.",
  },
  {
    icon: ShieldCheck,
    title: "Your address stays yours",
    body: "A provider sees your barangay only. The exact address goes out once you confirm.",
  },
];

/**
 * Two-panel frame shared by the sign in, sign up and password reset screens.
 * The form owns the page on mobile; the ink panel is supporting material and
 * only appears once there is room for it.
 */
export function AuthShell({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Form side */}
      <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <Link href="/" className="inline-flex w-fit rounded-sm" aria-label="FixItPH home">
          <Logo />
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold text-balance sm:text-4xl">{title}</h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">{lead}</p>

          <div className="mt-8">{children}</div>
        </div>

        {footer ? (
          <div className="text-muted-foreground mx-auto w-full max-w-md text-sm">
            {footer}
          </div>
        ) : null}
      </div>

      {/* Supporting panel. Hidden on phones, where it would just be scroll. */}
      <aside className="bg-brand-panel text-brand-panel-foreground hidden lg:flex lg:w-[38%] lg:max-w-lg lg:flex-col lg:justify-center lg:px-12">
        <p className="text-sm font-semibold text-white/60">
          Northern Mindanao and Caraga
        </p>
        <p className="font-heading mt-3 text-2xl leading-snug font-bold text-balance">
          512 verified providers across Butuan, Cagayan de Oro, and Iligan.
        </p>

        <ul className="mt-10 space-y-7">
          {REASSURANCES.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex gap-4">
                <Icon className="text-accent mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">
                    {item.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
