import Link from "next/link";
import { BadgeCheck, Clock, MapPin, Star } from "lucide-react";

import { ServiceSearch } from "@/components/site/service-search";
import { Separator } from "@/components/ui/separator";

/** Sample of what the request feed looks like once a city is live. */
const recentRequests = [
  {
    service: "Aircon cleaning, 2 split type units",
    place: "Barangay Ampayon, Butuan City",
    activity: "4 quotes in 35 minutes",
    posted: "12 min ago",
  },
  {
    service: "Kitchen sink leaking under the cabinet",
    place: "Barangay Carmen, Cagayan de Oro",
    activity: "3 quotes in 1 hour",
    posted: "48 min ago",
  },
  {
    service: "Breaker keeps tripping after the brownout",
    place: "Barangay Tibanga, Iligan City",
    activity: "2 quotes in 20 minutes",
    posted: "1 hr ago",
  },
];

const stats = [
  { value: "512", label: "verified providers" },
  { value: "1,240", label: "jobs booked this month" },
  { value: "4.8", label: "average rating" },
];

export function Hero() {
  return (
    <section
      className="border-border relative overflow-hidden border-b"
      aria-labelledby="hero-heading"
    >
      {/* Plan-paper grid instead of a gradient wash. Reads like a wiring or
          plumbing layout, which is the actual subject matter. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-[0.28]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 30% 0%, black 30%, transparent 78%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-20">
        <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500 lg:col-span-7">
          <p className="text-primary mb-4 flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4" aria-hidden />
            Northern Mindanao and Caraga
          </p>

          <h1
            id="hero-heading"
            className="text-4xl leading-[1.05] font-extrabold text-balance sm:text-5xl lg:text-6xl"
          >
            Find someone to <mark>fix it</mark>, today.
          </h1>

          <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-relaxed motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:delay-100 motion-safe:duration-500">
            Plumbers, electricians, aircon techs, and computer repair across
            Butuan, Cagayan de Oro, and Iligan. Every provider shows a verified
            ID, a rating from finished jobs, and a starting rate before you
            message them.
          </p>

          <ServiceSearch className="mt-7 max-w-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:delay-200 motion-safe:duration-500" />

          <p className="text-muted-foreground mt-3 text-sm">
            Free for customers. No booking fee, no charge to ask for a quote.
          </p>

          <dl className="mt-8 flex max-w-2xl flex-wrap items-center gap-x-6 gap-y-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:fill-mode-both motion-safe:delay-300 motion-safe:duration-500">
            {stats.map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-6">
                {i > 0 && (
                  <Separator
                    orientation="vertical"
                    className="hidden !h-8 sm:block"
                  />
                )}
                <div>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-heading text-2xl font-bold">
                    {stat.value}
                  </dd>
                  <dd className="text-muted-foreground text-sm">
                    {stat.label}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* Not a stock photo. What the product actually produces: requests
            coming in from real barangays. */}
        <div className="mt-12 lg:col-span-5 lg:mt-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both motion-safe:delay-200 motion-safe:duration-600">
          <div className="border-border bg-card rounded-lg border-2">
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Requests posted today</h2>
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <span
                  className="bg-accent ring-lime-700 inline-block size-2 rounded-full ring-1"
                  aria-hidden
                />
                Updated just now
              </span>
            </div>

            <ul className="divide-border divide-y">
              {recentRequests.map((req) => (
                <li key={req.service} className="px-4 py-4">
                  <p className="font-medium">{req.service}</p>
                  <p className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-sm">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    {req.place}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-brand-lime-ink text-xs font-semibold">
                      {req.activity}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Clock className="size-3" aria-hidden />
                      {req.posted}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="bg-secondary border-border flex items-center justify-between gap-3 rounded-b-md border-t px-4 py-3">
              <p className="text-muted-foreground text-sm">
                Posting a job takes about a minute.
              </p>
              <Link
                href="#search"
                className="link-lime text-sm"
              >
                Post yours
              </Link>
            </div>
          </div>

          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5">
              <BadgeCheck className="text-primary size-4" aria-hidden />
              ID and permit checked
            </span>
            <span className="flex items-center gap-1.5">
              <Star
                className="size-4 fill-foreground text-foreground"
                aria-hidden
              />
              Ratings from finished jobs only
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
