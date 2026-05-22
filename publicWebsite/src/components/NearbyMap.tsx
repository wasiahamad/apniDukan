import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import type { Shop } from "@/data/mockData";

const GOOGLE_MAPS_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();

type NearbyMapProps = {
  userLocation?: { latitude: number; longitude: number } | null;
  shops: Shop[];
  height?: string;
};

type GoogleMarker = { setMap: (map: any | null) => void };

const loadGoogleMaps = () => {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (!GOOGLE_MAPS_KEY) return Promise.resolve(null);

  return new Promise<any>((resolve, reject) => {
    const scriptId = "google-maps-script";
    if (document.getElementById(scriptId)) {
      const timer = setInterval(() => {
        if ((window as any).google?.maps) {
          clearInterval(timer);
          resolve((window as any).google);
        }
      }, 200);
      setTimeout(() => {
        clearInterval(timer);
        reject(new Error("Maps script timeout"));
      }, 8000);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve((window as any).google);
    script.onerror = () => reject(new Error("Maps script failed"));
    document.head.appendChild(script);
  });
};

export default function NearbyMap({ userLocation, shops, height = "420px" }: NearbyMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);

  const center = useMemo(() => {
    if (userLocation) return { lat: userLocation.latitude, lng: userLocation.longitude };
    const first = shops.find((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
    if (first) return { lat: first.latitude, lng: first.longitude };
    return null;
  }, [shops, userLocation]);

  useEffect(() => {
    let active = true;
    if (!center || !mapRef.current) return;

    loadGoogleMaps()
      .then((google) => {
        if (!active) return;
        if (!google?.maps) {
          setMapError("Maps unavailable");
          return;
        }

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });

        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        shops.forEach((shop) => {
          if (!Number.isFinite(shop.latitude) || !Number.isFinite(shop.longitude)) return;
          const marker = new google.maps.Marker({
            map,
            position: { lat: shop.latitude, lng: shop.longitude },
            title: shop.name,
          });
          markersRef.current.push(marker);
        });

        if (userLocation) {
          const userMarker = new google.maps.Marker({
            map,
            position: { lat: userLocation.latitude, lng: userLocation.longitude },
            title: "You are here",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: "#16a34a",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 7,
            },
          });
          markersRef.current.push(userMarker);
        }
      })
      .catch((err) => {
        console.error("Maps load error", err);
        setMapError("Maps failed to load");
      });

    return () => {
      active = false;
      markersRef.current.forEach((m) => m.setMap(null));
    };
  }, [center, shops, userLocation]);

  if (!center || !GOOGLE_MAPS_KEY) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MapPin className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Live map view ke liye Google Maps API key required hai.
        </p>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">{mapError}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card">
      <div ref={mapRef} style={{ height }} />
      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-foreground shadow">
        Live Nearby Map
      </div>
      {userLocation ? (
        <Button
          size="sm"
          className="absolute bottom-4 right-4"
          onClick={() => {
            const url = `https://www.google.com/maps/search/?api=1&query=${userLocation.latitude},${userLocation.longitude}`;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        >
          Open Maps
        </Button>
      ) : null}
    </div>
  );
}
