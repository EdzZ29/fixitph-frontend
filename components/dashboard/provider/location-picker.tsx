"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";

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
const MapControls = dynamic(
  () => import("@/components/ui/map").then((m) => m.MapControls),
  { ssr: false },
);

/** Butuan, where most of the providers are. Only used until a pin is set. */
const DEFAULT_CENTRE: [number, number] = [125.5406, 8.9475];

/**
 * Where a provider says they are based.
 *
 * A drag rather than a search box: a provider knows their own barangay by
 * sight far better than they can spell it into a geocoder, and this needs no
 * third-party lookup service to be standing up.
 *
 * What they place here is not published as-is. The API blunts it to roughly a
 * barangay before it appears in any public payload, which is said on the
 * screen — somebody dropping a pin on their house deserves to know the map
 * will not show it there.
 */
export function LocationPicker({
  latitude,
  longitude,
  onChange,
  disabled,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (next: { latitude: number | null; longitude: number | null }) => void;
  disabled?: boolean;
}) {
  const placed = latitude !== null && longitude !== null;
  const centre: [number, number] = placed
    ? [longitude, latitude]
    : DEFAULT_CENTRE;

  return (
    <div className="space-y-2">
      <div className="border-border h-64 overflow-hidden rounded-lg border-2">
        <Map
          center={centre}
          zoom={placed ? 13 : 11}
          dragRotate={false}
          attributionControl={{ compact: true }}
          className="h-full w-full"
        >
          <MapControls position="top-right" showZoom />

          {placed ? (
            <MapMarker
              longitude={longitude}
              latitude={latitude}
              draggable={!disabled}
              onDragEnd={(lngLat) =>
                onChange({
                  latitude: Number(lngLat.lat.toFixed(6)),
                  longitude: Number(lngLat.lng.toFixed(6)),
                })
              }
            >
              <MarkerContent>
                <span
                  className="bg-accent block size-4 rotate-45 border-2 border-white shadow-sm"
                  aria-hidden
                />
              </MarkerContent>
            </MapMarker>
          ) : null}
        </Map>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {placed ? (
          <>
            <p className="text-muted-foreground text-xs tabular-nums">
              Pin at {latitude.toFixed(4)}, {longitude.toFixed(4)} — drag it to
              correct.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange({ latitude: null, longitude: null })}
            >
              Remove pin
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              onChange({
                latitude: DEFAULT_CENTRE[1],
                longitude: DEFAULT_CENTRE[0],
              })
            }
          >
            <MapPin aria-hidden />
            Put me on the map
          </Button>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        Customers see your barangay, never this exact point — the map rounds it
        to about a kilometre. Without a pin you still appear in search by city,
        just not on the map.
      </p>
    </div>
  );
}
