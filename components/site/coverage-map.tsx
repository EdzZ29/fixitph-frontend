"use client";

import dynamic from "next/dynamic";
import { cities } from "@/lib/site-data";
import { cn } from "cn";

// maplibre touches window on import, so the map only loads in the browser.
const Map = dynamic(() => import("@/components/ui/map").then((m) => m.Map), {
  ssr: false,
  loading: () => (
    <div className="bg-secondary text-muted-foreground flex h-full w-full items-center justify-center text-sm">
      Loading coverage map
    </div>
  ),
});
const MapMarker = dynamic(
  () => import("@/components/ui/map").then((m) => m.MapMarker),
  { ssr: false },
);
const MarkerContent = dynamic(
  () => import("@/components/ui/map").then((m) => m.MarkerContent),
  { ssr: false },
);
const MapControls = dynamic(
  () => import("@/components/ui/map").then((m) => m.MapControls),
  { ssr: false },
);

export function CoverageMap() {
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-6">
        <ul className="ruled-grid grid grid-cols-2">
          {cities.map((city) => (
            <li key={city.name} className="px-4 py-3.5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    city.status === "live"
                      ? "bg-accent ring-lime-700 ring-1"
                      : "bg-muted-foreground",
                  )}
                  aria-hidden
                />
                {city.name}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {city.region}
              </p>
              <p className="mt-1.5 text-xs font-medium">
                {city.status === "live"
                  ? `${city.providerCount} providers`
                  : `${city.providerCount} signed up, opening soon`}
              </p>
            </li>
          ))}
        </ul>

        <div className="text-muted-foreground mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <span className="flex items-center gap-2">
            <span
              className="bg-accent ring-lime-700 size-2 rounded-full ring-1"
              aria-hidden
            />
            Taking bookings now
          </span>
          <span className="flex items-center gap-2">
            <span
              className="bg-muted-foreground size-2 rounded-full"
              aria-hidden
            />
            Building the provider list
          </span>
        </div>
      </div>

      <div className="lg:col-span-6">
        <div className="border-border h-[340px] overflow-hidden rounded-lg border-2 sm:h-[420px] lg:h-full lg:min-h-[460px]">
          <Map
            /* Framed to the coverage area rather than a hand-picked zoom, so
               it stays correct at every breakpoint. */
            bounds={[
              [123.6, 7.6],
              [126.5, 10.0],
            ]}
            fitBoundsOptions={{ padding: 48 }}
            scrollZoom={false}
            dragRotate={false}
            attributionControl={{ compact: true }}
            className="h-full w-full"
          >
            <MapControls position="top-right" showZoom />
            {cities.map((city) => (
              <MapMarker
                key={city.name}
                longitude={city.coordinates[0]}
                latitude={city.coordinates[1]}
              >
                <MarkerContent>
                  <span
                    className={cn(
                      "block size-3 rotate-45 border-2 border-white shadow-sm",
                      city.status === "live"
                        ? "bg-lime-500"
                        : "bg-muted-foreground",
                    )}
                    aria-hidden
                  />
                </MarkerContent>
              </MapMarker>
            ))}
          </Map>
        </div>
      </div>
    </div>
  );
}
