import Link from "next/link";
import { Check, ClipboardList, MessageSquareText, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";

const benefits = [
  "Set your own rates and pick the barangays you actually cover.",
  "Job requests arrive by SMS and Viber, so you do not have to keep an app open all day.",
  "Keep the full amount you quote during the pilot. No commission until we tell you in writing.",
  "Get paid in cash, GCash, or bank transfer, whichever you and the customer agree on.",
];

const facts = [
  {
    icon: ClipboardList,
    label: "What you need",
    value: "A valid ID and the permit your trade requires",
  },
  {
    icon: MessageSquareText,
    label: "How long verification takes",
    value: "Usually 2 working days",
  },
  {
    icon: Wallet,
    label: "What it costs to join",
    value: "Nothing during the pilot",
  },
];

export function ProviderCta() {
  return (
    <section
      id="become-a-provider"
      aria-labelledby="provider-cta-heading"
      className="bg-brand-panel text-brand-panel-foreground scroll-mt-28"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:grid lg:grid-cols-12 lg:gap-14 lg:px-8">
        <div className="lg:col-span-6">
          <h2
            id="provider-cta-heading"
            className="text-3xl font-extrabold text-balance sm:text-4xl"
          >
            You already do the work. The hard part is people finding you.
          </h2>
          <p className="mt-5 max-w-xl leading-relaxed text-white/75">
            If your bookings come from a Facebook page and word of mouth, you
            lose jobs to whoever happens to reply first. FixItPH puts your
            rates, your service area, and your finished work in front of people
            who are already searching for it.
          </p>

          <ul className="mt-8 space-y-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex gap-3">
                <Check
                  className="text-accent mt-0.5 size-5 shrink-0"
                  aria-hidden
                />
                <span className="leading-relaxed text-white/85">{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              variant="accent"
              className="h-12 px-6 text-base"
            >
              <Link href="/providers/join">Join as a provider</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 border-white/25 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white dark:border-white/25 dark:bg-transparent dark:hover:bg-white/10"
            >
              <Link href="/providers/terms">Read the provider terms</Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 lg:col-span-6 lg:mt-0">
          <dl className="divide-y divide-white/15 rounded-lg border-2 border-white/20">
            {facts.map((fact) => {
              const Icon = fact.icon;
              return (
                <div
                  key={fact.label}
                  className="flex items-start gap-4 px-5 py-5 sm:px-6"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white/10">
                    <Icon className="text-accent size-5" aria-hidden />
                  </span>
                  <div>
                    <dt className="text-sm text-white/65">{fact.label}</dt>
                    <dd className="mt-1 font-semibold">{fact.value}</dd>
                  </div>
                </div>
              );
            })}
          </dl>

          <div className="mt-6 rounded-lg bg-white/5 px-5 py-5 sm:px-6">
            <p className="leading-relaxed text-white/75">
              Not sure if your trade fits? Call the provider hotline and ask.
              Somebody in Butuan picks up from 8AM to 6PM, Monday to Saturday.
            </p>
            <a
              href="tel:+639175550143"
              className="mt-3 inline-block text-lg font-bold text-white hover:underline"
            >
              0917 555 0143
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
