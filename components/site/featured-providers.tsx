import Link from "next/link";
import { BadgeCheck, Clock, MapPin, Star } from "lucide-react";

import { SectionHeading } from "@/components/site/section-heading";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { featuredProviders } from "@/lib/site-data";

export function FeaturedProviders() {
  return (
    <section
      id="providers"
      aria-labelledby="providers-heading"
      className="border-border border-b scroll-mt-28"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8">
        <SectionHeading
          id="providers-heading"
          title="People taking jobs this week"
          lead="A sample of providers with the most finished bookings in their city. Rates shown are starting points, and the quote for your job comes before you commit."
          action={
            <Button asChild variant="outline" className="h-10 px-4">
              <Link href="/providers">See all providers</Link>
            </Button>
          }
        />

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProviders.map((provider) => (
            <li key={provider.name}>
              <Card className="border-border h-full gap-0 rounded-lg border-2 py-0 shadow-none ring-0">
                <CardHeader className="grid-cols-[auto_1fr] items-start gap-3.5 border-b px-5 py-5 [.border-b]:pb-5">
                  <Avatar className="size-12 rounded-md">
                    <AvatarFallback className="bg-primary text-primary-foreground rounded-md text-base font-bold">
                      {provider.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold">
                      {provider.name}
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {provider.trade}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 px-5 py-5">
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <MapPin className="size-4 shrink-0" aria-hidden />
                    Barangay {provider.barangay}, {provider.city}
                  </p>

                  <p className="flex items-center gap-2 text-sm">
                    <Star
                      className="fill-foreground text-foreground size-4 shrink-0"
                      aria-hidden
                    />
                    <span className="font-semibold">
                      {provider.rating.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      from {provider.jobs} finished jobs
                    </span>
                  </p>

                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Clock className="size-4 shrink-0" aria-hidden />
                    {provider.availability}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {provider.verified.map((item) => (
                      <Badge
                        key={item}
                        variant="secondary"
                        className="text-muted-foreground h-6 rounded-md px-2 font-medium"
                      >
                        <BadgeCheck
                          className="text-brand-lime-ink size-3.5"
                          aria-hidden
                        />
                        {item}
                      </Badge>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="bg-secondary mt-auto flex items-center justify-between gap-3 rounded-b-md border-t px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-base font-bold">
                      From {provider.startingRate}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {provider.rateUnit}
                    </p>
                  </div>
                  <Button asChild variant="outline" className="h-9 shrink-0 px-3">
                    <Link href="/providers">
                      View profile
                      <span className="sr-only"> of {provider.name}</span>
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
