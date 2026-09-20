import Link from "next/link";
import { Check } from "lucide-react";

import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { API_URL, type PlanDefinition, type ProviderPlan } from "@/lib/api/client";
import { money } from "@/lib/format";

const ORDER: ProviderPlan[] = ["FREE", "PRO", "MAX"];

/**
 * What the page shows if the API cannot be reached.
 *
 * The landing page has no other API dependency, and it is the first thing a
 * visitor sees. A pricing table that renders the published prices during an
 * outage is better than a section that disappears — and these match the
 * migration's seeded catalogue, so the fallback is not a guess.
 */
const FALLBACK: Record<ProviderPlan, PlanDefinition> = {
  FREE: {
    label: "Free trial",
    price: 0,
    serviceLimit: 3,
    trialDays: 7,
    tagline: "A week to see whether the work comes in.",
    features: [
      "List up to 3 services for 7 days",
      "Quote on open requests in your area",
      "Messaging, bookings and reviews",
      "Verification badges once your documents are approved",
      "Your listings are hidden when the trial ends, until you buy a plan",
    ],
  },
  PRO: {
    label: "Pro",
    price: 299,
    serviceLimit: 5,
    trialDays: null,
    tagline: "For a tradesperson offering a few different jobs.",
    features: [
      "List up to 5 services",
      "Everything in the free trial, kept for good",
      "One-time payment, no renewal and no expiry",
    ],
  },
  MAX: {
    label: "Max",
    price: 499,
    serviceLimit: null,
    trialDays: null,
    tagline: "For a shop with a full catalogue.",
    features: [
      "Unlimited services",
      "Everything in Pro",
      "One-time payment, no renewal and no expiry",
    ],
  },
};

/**
 * Read from the public settings endpoint rather than hard-coded, so an
 * operator changing a price in the admin screen changes what visitors are
 * quoted. Revalidated rather than fetched per request: a price list does not
 * need to be live to the second, and the landing page should not make an API
 * call for every visitor.
 */
async function loadPlans(): Promise<Record<ProviderPlan, PlanDefinition>> {
  try {
    const res = await fetch(`${API_URL}/settings`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return FALLBACK;

    const body = (await res.json()) as {
      data?: Record<string, unknown>;
    };
    const catalogue = body.data?.["plans.catalogue"] as
      | Partial<Record<ProviderPlan, PlanDefinition>>
      | undefined;
    if (!catalogue) return FALLBACK;

    return {
      FREE: catalogue.FREE ?? FALLBACK.FREE,
      PRO: catalogue.PRO ?? FALLBACK.PRO,
      MAX: catalogue.MAX ?? FALLBACK.MAX,
    };
  } catch {
    return FALLBACK;
  }
}

function limitLabel(limit: number | null): string {
  return limit === null ? "Unlimited services" : `Up to ${limit} services`;
}

/**
 * Provider pricing, on the public page.
 *
 * Aimed at a tradesperson deciding whether to sign up, so it leads with what
 * it costs to list work rather than with features. The commission is named
 * here too: finding out about a fee after joining is the thing that makes
 * people distrust a marketplace.
 */
export async function ProviderPlans() {
  const plans = await loadPlans();

  return (
    <section
      id="plans"
      aria-labelledby="plans-heading"
      className="border-border scroll-mt-28 border-b"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8">
        <SectionHeading
          id="plans-heading"
          title="What it costs to list your work"
          lead="Try it free for a week with three services. After that a one-time payment keeps your listings up for good — there is no monthly fee and nothing to cancel."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {ORDER.map((key) => {
            const plan = plans[key];
            const highlighted = key === "PRO";

            return (
              <div
                key={key}
                className={
                  highlighted
                    ? "border-accent relative flex flex-col rounded-lg border-2 px-6 py-7"
                    : "border-border relative flex flex-col rounded-lg border-2 px-6 py-7"
                }
              >
                {highlighted ? (
                  <span className="bg-accent text-accent-foreground absolute -top-3 left-6 rounded-4xl px-3 py-0.5 text-xs font-semibold">
                    Most popular
                  </span>
                ) : null}

                <h3 className="font-heading text-xl font-semibold">
                  {plan.label}
                </h3>

                <p className="font-heading mt-2 text-4xl font-extrabold tabular-nums">
                  {plan.price === 0 ? "Free" : money(plan.price)}
                  <span className="text-muted-foreground ml-2 font-sans text-sm font-normal">
                    {plan.price > 0
                      ? "one time"
                      : plan.trialDays
                        ? `for ${plan.trialDays} days`
                        : ""}
                  </span>
                </p>

                {plan.tagline ? (
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {plan.tagline}
                  </p>
                ) : null}

                <p className="mt-5 font-semibold">
                  {limitLabel(plan.serviceLimit)}
                </p>

                {plan.features?.length ? (
                  <ul className="mt-3 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2.5">
                        <Check
                          className="text-accent mt-0.5 size-4.5 shrink-0"
                          aria-hidden
                        />
                        <span className="text-muted-foreground text-sm leading-relaxed">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="flex-1" />

                <Button
                  asChild
                  variant={highlighted ? "accent" : "outline"}
                  className="mt-7 h-11"
                >
                  {/*
                    Plain /register: the form has its own customer/provider
                    toggle and does not read a role from the query, so a
                    parameter here would look meaningful and do nothing. A
                    paid plan is bought from the provider dashboard once they
                    are in, which is the only place the payment flow exists.
                  */}
                  <Link href="/register">
                    {plan.price === 0 ? "Start the free trial" : `Get ${plan.label}`}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>

        {/*
          Said here rather than in the small print. A provider who discovers a
          fee after signing up treats the whole platform as sharp practice,
          and the commission is easier to accept when it is only charged on
          work the platform actually brought them.
        */}
        <p className="text-muted-foreground mt-8 text-sm leading-relaxed">
          Plans cover how many services you can list. Separately, FixItPH
          charges providers a 5% marketplace commission on completed bookings
          generated through the platform. Customers pay you directly — FixItPH
          does not process or hold customer service payments.
        </p>
      </div>
    </section>
  );
}
