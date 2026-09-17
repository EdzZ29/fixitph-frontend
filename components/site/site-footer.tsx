import Link from "next/link";
import { Mail, MessageCircleMore, Phone } from "lucide-react";

import { Logo } from "@/components/site/logo";
import { Separator } from "@/components/ui/separator";
import { categories, cities, moreServices } from "@/lib/site-data";

/** Lucide dropped brand glyphs, so the Facebook mark is inlined here. */
function FacebookMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

const company = [
  { label: "About FixItPH", href: "/about" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Become a provider", href: "#become-a-provider" },
  { label: "Provider terms", href: "/providers/terms" },
  { label: "Careers in Butuan", href: "/careers" },
];

const support = [
  { label: "Help centre", href: "/help" },
  { label: "Report a provider", href: "/report" },
  { label: "Cancellations and refunds", href: "/help/refunds" },
  { label: "Safety while at your home", href: "/help/safety" },
];

const legal = [
  { label: "Terms of use", href: "/terms" },
  { label: "Privacy policy", href: "/privacy" },
  { label: "Data privacy (RA 10173)", href: "/privacy/data-subject-rights" },
];

export function SiteFooter() {
  return (
    <footer className="border-border border-t">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Logo />
            <p className="text-muted-foreground mt-4 max-w-sm text-sm leading-relaxed">
              A directory of verified repair and service providers for Northern
              Mindanao and Caraga. Built in Butuan City.
            </p>

            <ul className="mt-6 space-y-3 text-sm">
              <li>
                <a
                  href="tel:+639175550143"
                  className="hover:text-primary flex items-center gap-2.5"
                >
                  <Phone className="text-muted-foreground size-4" aria-hidden />
                  0917 555 0143
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@fixitph.com"
                  className="hover:text-primary flex items-center gap-2.5"
                >
                  <Mail className="text-muted-foreground size-4" aria-hidden />
                  hello@fixitph.com
                </a>
              </li>
              <li className="text-muted-foreground flex items-center gap-2.5">
                <MessageCircleMore className="size-4" aria-hidden />
                Viber replies within the day
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-sm font-bold">Services</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/services/${category.slug}`}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
              {moreServices.map((service) => (
                <li key={service.name}>
                  <Link
                    href="/services"
                    className="text-muted-foreground hover:text-primary"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h2 className="text-sm font-bold">Cities served</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm lg:grid-cols-1">
              {cities.map((city) => (
                <li key={city.name}>
                  <Link
                    href={`/cities/${city.name.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {city.name}
                    {city.status === "opening" ? (
                      <span className="text-muted-foreground ml-1.5 text-xs font-medium">
                        soon
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h2 className="text-sm font-bold">Company</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {company.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h2 className="mt-8 text-sm font-bold">Support</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {support.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <p>© {new Date().getFullYear()} FixItPH Services Inc.</p>
            {legal.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://facebook.com/fixitph"
              aria-label="FixItPH on Facebook"
              className="border-border text-muted-foreground hover:border-primary hover:text-primary flex size-9 items-center justify-center rounded-md border transition-colors"
            >
              <FacebookMark className="size-4.5" />
            </a>
            <a
              href="viber://chat?number=%2B639175550143"
              aria-label="Message FixItPH on Viber"
              className="border-border text-muted-foreground hover:border-primary hover:text-primary flex size-9 items-center justify-center rounded-md border transition-colors"
            >
              <MessageCircleMore className="size-4.5" aria-hidden />
            </a>
            <a
              href="mailto:hello@fixitph.com"
              aria-label="Email FixItPH"
              className="border-border text-muted-foreground hover:border-primary hover:text-primary flex size-9 items-center justify-center rounded-md border transition-colors"
            >
              <Mail className="size-4.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
