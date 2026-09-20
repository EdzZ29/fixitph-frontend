"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ProviderSummary, PublicService } from "@/lib/api/client";
import { priceLine } from "@/lib/format";
import { cities } from "@/lib/site-data";
import { cn } from "cn";

// maplibre touches window on import, so the map only loads in the browser.
const Map = dynamic(() => import("@/components/ui/map").then((m) => m.Map), {
  ssr: false,
  loading: () => (
    <div className="bg-secondary text-muted-foreground flex h-full w-full items-center justify-center text-sm">
      Loading map
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
const MarkerTooltip = dynamic(
  () => import("@/components/ui/map").then((m) => m.MarkerTooltip),
  { ssr: false },
);
const MapControls = dynamic(
  () => import("@/components/ui/map").then((m) => m.MapControls),
  { ssr: false },
);

/** One thing to pin, reduced to what a map actually needs. */
interface Pin {
  key: string;
  lng: number;
  lat: number;
  title: string;
  href: string;
  /** Second line: the price for a service, the headline for a provider. */
  detail: string | null;
  area: string;
  ratingAvg: string | number;
  ratingCount: number;
}

function area(provider: { baseBarangay: string | null; baseCity: string }) {
  return [provider.baseBarangay, provider.baseCity].filter(Boolean).join(", ");
}

function providerPins(providers: ProviderSummary[]): Pin[] {
  return providers.flatMap((provider) =>
    provider.approxLatitude === null || provider.approxLongitude === null
      ? []
      : [
          {
            key: provider.id,
            lng: provider.approxLongitude,
            lat: provider.approxLatitude,
            title: provider.businessName,
            href: `/providers/${provider.slug}`,
            detail: provider.headline,
            area: area(provider),
            ratingAvg: provider.ratingAvg,
            ratingCount: provider.ratingCount,
          },
        ],
  );
}

function servicePins(services: PublicService[]): Pin[] {
  return services.flatMap((service) => {
    const { provider } = service;
    if (provider.approxLatitude === null || provider.approxLongitude === null) {
      return [];
    }
    return [
      {
        key: service.id,
        lng: provider.approxLongitude,
        lat: provider.approxLatitude,
        title: service.title,
        href: `/services/${service.id}`,
        detail: `${priceLine(service)} · ${provider.businessName}`,
        area: area(provider),
        ratingAvg: provider.ratingAvg,
        ratingCount: provider.ratingCount,
      },
    ];
  });
}

/**
 * The map as a place-picker: every covered city, click one to search it.
 *
 * Only the live ones are clickable. A city still building its provider list
 * would return nothing, and a search that comes back empty reads as a broken
 * site rather than as a town that has not opened yet.
 */
function CityPicker({ onSelect }: { onSelect: (city: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="border-border h-[480px] overflow-hidden rounded-lg border-2">
        <Map
          bounds={[
            [123.6, 7.6],
            [126.5, 10.0],
          ]}
          fitBoundsOptions={{ padding: 48 }}
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
              onClick={
                city.status === "live" ? () => onSelect(city.name) : undefined
              }
            >
              <MarkerContent>
                <span
                  className={cn(
                    "block size-3.5 rotate-45 border-2 border-white shadow-sm",
                    city.status === "live"
                      ? "bg-accent cursor-pointer"
                      : "bg-muted-foreground",
                  )}
                  aria-hidden
                />
              </MarkerContent>

              <MarkerTooltip>
                <div className="bg-background border-border rounded-md border px-3 py-2 shadow-md">
                  <p className="text-sm font-semibold">{city.name}</p>
                  <p className="text-muted-foreground text-xs">{city.region}</p>
                  <p className="mt-1 text-xs font-medium">
                    {city.status === "live"
                      ? `${city.providerCount} providers`
                      : `${city.providerCount} signed up, opening soon`}
                  </p>
                  {city.status === "live" ? (
                    <p className="text-accent-foreground bg-accent mt-1.5 rounded-sm px-1.5 py-0.5 text-center text-xs font-medium">
                      Click to search here
                    </p>
                  ) : null}
                </div>
              </MarkerTooltip>
            </MapMarker>
          ))}
        </Map>
      </div>
      <p className="text-muted-foreground text-xs">
        Pick a city to see the providers and services working there. Grey pins
        are still building their provider list.
      </p>
    </div>
  );
}

/**
 * A pin for every result, placed where its provider works.
 *
 * The coordinates are the provider's, blunted by the API to roughly a
 * barangay — a service has no location of its own, it happens wherever the
 * person offering it is based. Two providers in the same barangay therefore
 * land on nearly the same spot, which is correct rather than a rounding bug:
 * the map answers "who works near me", and the exact address is a thing the
 * platform releases after a booking, not on a public page.
 *
 * Providers who never set a location simply have no pin. Inventing one would
 * put somebody in a barangay they do not work in.
 */
export function ResultsMap({
  providers,
  services,
  city,
  onSelectCity,
}: {
  providers?: ProviderSummary[];
  services?: PublicService[];
  /** The city filter currently applied, if any. */
  city?: string;
  onSelectCity?: (city: string | null) => void;
}) {
  const pins = providers ? providerPins(providers) : servicePins(services ?? []);
  const missing = (providers?.length ?? services?.length ?? 0) - pins.length;

  /**
   * With no city chosen, the map is a place-picker rather than a result list.
   *
   * Showing every pin in the region at once answers nothing — the useful
   * first question on a map is "where", and only then "who". Picking a city
   * sets the same filter the sidebar sets, so the grid, table and map all
   * agree afterwards.
   */
  if (!city && onSelectCity) {
    return <CityPicker onSelect={onSelectCity} />;
  }

  if (!pins.length) {
    return (
      <div className="border-border flex h-[420px] flex-col items-center justify-center gap-3 rounded-lg border-2 px-6 text-center">
        <p className="text-muted-foreground text-sm">
          None of these results have a location set yet, so there is nothing to
          put on a map. The list and table views show all of them.
        </p>
        {onSelectCity ? (
          <Button variant="outline" size="sm" onClick={() => onSelectCity(null)}>
            Pick a different place
          </Button>
        ) : null}
      </div>
    );
  }

  /**
   * Framed to the results rather than a fixed view, so a search confined to
   * one city is not drawn at island scale. Padded, or a pin on the edge sits
   * under the frame.
   */
  const lngs = pins.map((pin) => pin.lng);
  const lats = pins.map((pin) => pin.lat);
  const pad = 0.05;
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...lngs) - pad, Math.min(...lats) - pad],
    [Math.max(...lngs) + pad, Math.max(...lats) + pad],
  ];

  return (
    <div className="space-y-2">
      <div className="border-border h-[480px] overflow-hidden rounded-lg border-2">
        <Map
          bounds={bounds}
          fitBoundsOptions={{ padding: 56, maxZoom: 13 }}
          dragRotate={false}
          attributionControl={{ compact: true }}
          className="h-full w-full"
        >
          <MapControls position="top-right" showZoom />

          {pins.map((pin) => (
            <MapMarker key={pin.key} longitude={pin.lng} latitude={pin.lat}>
              <MarkerContent>
                <span
                  className="bg-accent block size-3.5 rotate-45 border-2 border-white shadow-sm"
                  aria-hidden
                />
              </MarkerContent>

              <MarkerTooltip>
                <div className="bg-background border-border max-w-64 rounded-md border px-3 py-2 shadow-md">
                  <p className="text-sm font-semibold">{pin.title}</p>
                  {pin.detail ? (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {pin.detail}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                    <MapPin className="size-3 shrink-0" aria-hidden />
                    {pin.area}
                  </p>
                  {pin.ratingCount > 0 ? (
                    <p className="mt-1 flex items-center gap-1 text-xs tabular-nums">
                      <Star className="text-accent size-3 fill-current" aria-hidden />
                      {Number(pin.ratingAvg).toFixed(1)}
                      <span className="text-muted-foreground">
                        ({pin.ratingCount})
                      </span>
                    </p>
                  ) : null}
                  <Link
                    href={pin.href}
                    className="link-lime mt-1.5 inline-block text-xs"
                  >
                    See details
                  </Link>
                </div>
              </MarkerTooltip>
            </MapMarker>
          ))}
        </Map>
      </div>

      {/*
        Said rather than left to be noticed. A map that silently drops results
        is worse than one that admits it, and the blunting is deliberate — a
        reader should know the pin is a neighbourhood, not a doorstep.
      */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-muted-foreground text-xs">
          Pins show the provider&apos;s barangay, not their exact address.
          {missing > 0
            ? ` ${missing} result${missing === 1 ? " has" : "s have"} no location set and ${missing === 1 ? "is" : "are"} not shown here.`
            : ""}
        </p>
        {onSelectCity ? (
          <button
            type="button"
            onClick={() => onSelectCity(null)}
            className="link-lime text-xs"
          >
            Pick a different place
          </button>
        ) : null}
      </div>
    </div>
  );
}
