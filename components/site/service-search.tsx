"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cities, searchSuggestions } from "@/lib/site-data";
import { cn } from "cn";

export function ServiceSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (service) params.set("q", service);
    if (location) params.set("city", location);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form
      id="search"
      onSubmit={handleSubmit}
      className={cn(
        "border-foreground bg-card rounded-lg border-2 p-2 sm:p-2.5",
        className,
      )}
      role="search"
      aria-label="Find a service provider"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="relative flex-[1.4]">
          <Label htmlFor="service" className="sr-only">
            What do you need done
          </Label>
          <Wrench
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="service"
            name="service"
            list="service-suggestions"
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="Aircon cleaning, tubero, CCTV"
            autoComplete="off"
            className="h-12 rounded-md border-0 bg-transparent pl-10 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <datalist id="service-suggestions">
            {searchSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        {/* Rule between the two fields: horizontal when stacked, vertical
            once they sit side by side. */}
        <div
          className="bg-border h-px w-full shrink-0 sm:h-auto sm:w-px"
          aria-hidden
        />

        <div className="relative flex-1">
          <Label htmlFor="location" className="sr-only">
            Your city or barangay
          </Label>
          <MapPin
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="location"
            name="location"
            list="city-suggestions"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Barangay or city"
            autoComplete="address-level2"
            className="h-12 rounded-md border-0 bg-transparent pl-10 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <datalist id="city-suggestions">
            {cities.map((c) => (
              <option key={c.name} value={c.name} />
            ))}
          </datalist>
        </div>

        <Button
          type="submit"
          variant="accent"
          className="h-12 shrink-0 gap-2 px-6 text-base sm:px-7"
        >
          <Search className="size-4.5" aria-hidden />
          Search
        </Button>
      </div>
    </form>
  );
}
