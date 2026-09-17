import Link from "next/link";

import { SectionHeading } from "@/components/site/section-heading";
import { categories, moreServices } from "@/lib/site-data";

export function ServiceCategories() {
  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="border-border border-b scroll-mt-28"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8">
        <SectionHeading
          id="services-heading"
          title="What do you need done?"
          lead="Starting rates are what providers in these cities actually charge for a standard job. The final quote depends on the work, and you see it before you book."
          action={
            <Link
              href="/services"
              className="link-lime text-sm"
            >
              Browse all 24 services
            </Link>
          }
        />

        {/* Shared hairlines, not six floating cards with matching shadows. */}
        <ul className="ruled-grid mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <li key={category.slug}>
                <Link
                  href={`/services/${category.slug}`}
                  className="hover:bg-card focus-visible:bg-card group flex h-full flex-col gap-3 p-6 transition-colors sm:p-7"
                >
                  <span className="bg-secondary text-foreground group-hover:bg-accent group-hover:text-accent-foreground flex size-11 items-center justify-center rounded-md transition-colors">
                    <Icon className="size-5.5" aria-hidden />
                  </span>

                  <div>
                    <h3 className="text-lg font-bold">
                      {category.name}
                      {category.localName ? (
                        <span className="text-muted-foreground ml-2 text-sm font-normal">
                          ({category.localName})
                        </span>
                      ) : null}
                    </h3>
                    <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                      {category.blurb}
                    </p>
                  </div>

                  <div className="border-border mt-auto flex items-baseline justify-between gap-3 border-t pt-3.5">
                    <span className="text-sm font-semibold">
                      From {category.startingRate}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {category.providerCount} providers
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3">
          <span className="text-muted-foreground text-sm">Also on FixItPH:</span>
          {moreServices.map((service) => {
            const Icon = service.icon;
            return (
              <Link
                key={service.name}
                href="/services"
                className="border-border hover:border-foreground hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
              >
                <Icon className="size-4" aria-hidden />
                {service.name}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
