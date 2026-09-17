import { BadgeCheck, ReceiptText, Star, X } from "lucide-react";
import { Check } from "lucide-react";

import { SectionHeading } from "@/components/site/section-heading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const oldWay = [
  "You post in a barangay buy and sell group and wait for somebody to comment.",
  "Rates come in private messages, if they come at all.",
  "You have no way to check whether the person has done this kind of job before.",
  "Once the work is finished there is no record of what was agreed or paid.",
];

const newWay = [
  "Search by service and barangay and see who covers your area right now.",
  "Starting rates are posted on the profile before you message anyone.",
  "Every provider shows a checked ID, the permits their trade requires, and a finished job count.",
  "The quote, the schedule, and the final amount stay in your booking history.",
];

const pillars = [
  {
    icon: BadgeCheck,
    kicker: "Verification",
    title: "Verification that means something",
    body: "A government ID matched to a selfie, plus the permit the trade needs. Electricians doing panel work show a PRC licence. Cleaning teams show how many people are coming.",
  },
  {
    icon: Star,
    kicker: "Ratings",
    title: "Ratings only from finished jobs",
    body: "A provider cannot collect reviews without completing bookings on FixItPH. No bought ratings, no reviews from friends, no five stars on a profile with zero work behind it.",
  },
  {
    icon: ReceiptText,
    kicker: "Pricing",
    title: "Pricing you can see beforehand",
    body: "Starting rates on every profile and a fixed quote before you confirm. If the job turns out bigger, the provider sends a revised quote and you approve it first.",
  },
];

const faqs = [
  {
    q: "Does FixItPH charge me anything?",
    a: "No. Searching, asking for quotes, and booking are free for customers. Providers pay a small fee on completed jobs once the pilot ends.",
  },
  {
    q: "How do you actually verify a provider?",
    a: "We match a government ID to a live selfie, then check the document the trade requires: a business permit, a barangay clearance, a TESDA certificate, or a PRC licence. Electricians doing panel and service entrance work cannot list without the licence.",
  },
  {
    q: "What happens if nobody shows up?",
    a: "Report the booking from your history. Any downpayment is returned and the no show is recorded on the provider profile. Two no shows within 90 days removes the provider from search.",
  },
  {
    q: "Can I pay through GCash?",
    a: "Yes. Cash, GCash, and bank transfer all work. You pay the provider directly after the work is done, not before.",
  },
  {
    q: "My town is not on your list yet.",
    a: "Post the job anyway. It gets routed to providers in the nearest covered city, and you see the travel charge before you accept the quote.",
  },
];

export function WhyFixItPH() {
  return (
    <section
      id="why-fixitph"
      aria-labelledby="why-heading"
      className="border-border border-b scroll-mt-28"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8">
        <SectionHeading
          id="why-heading"
          title="Finding a reliable tubero should not take three days"
          lead="Most repair work in Northern Mindanao gets arranged through Facebook groups, group chats, and asking a neighbour who they used last time. That works until it does not."
        />

        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border-2 border-border md:grid-cols-2">
          <div className="bg-card p-6 sm:p-8">
            <h3 className="text-muted-foreground text-base font-bold">
              How it usually goes
            </h3>
            <ul className="mt-5 space-y-4">
              {oldWay.map((item) => (
                <li key={item} className="text-muted-foreground flex gap-3">
                  <X className="mt-0.5 size-4.5 shrink-0" aria-hidden />
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-brand-panel text-brand-panel-foreground p-6 sm:p-8">
            <h3 className="text-base font-bold">How it goes on FixItPH</h3>
            <ul className="mt-5 space-y-4">
              {newWay.map((item) => (
                <li key={item} className="flex gap-3">
                  <Check
                    className="text-accent mt-0.5 size-4.5 shrink-0"
                    aria-hidden
                  />
                  <span className="text-sm leading-relaxed text-white/85">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ul className="ruled-grid mt-12 grid sm:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <li key={pillar.title} className="p-6 sm:p-7">
                <span className="text-brand-lime-ink flex items-center gap-2.5 text-sm font-semibold">
                  <Icon className="size-5" aria-hidden />
                  {pillar.kicker}
                </span>
                <h3 className="mt-3 text-lg font-bold">{pillar.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {pillar.body}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mt-14 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <h3 className="text-2xl font-bold lg:col-span-4">
            Questions people ask before they book
          </h3>
          <Accordion
            type="single"
            collapsible
            defaultValue="faq-0"
            className="lg:col-span-8"
          >
            {faqs.map((faq, i) => (
              <AccordionItem key={faq.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
