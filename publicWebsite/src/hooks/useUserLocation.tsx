import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo, useRef } from "react";
import { API_BASE_URL } from "@/lib/publicShopsApi";

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  source?: "gps" | "cache";
}

const STORAGE_KEY = "dukandirect:userLocation:v1";
const LOCATION_SYNC_THROTTLE_MS = 30000;
const LOCATION_DISTANCE_REFRESH_METERS = 100;

const readCachedLocation = (): UserLocation | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lat = Number(parsed?.latitude);
    const lng = Number(parsed?.longitude);
    const accuracy = Number(parsed?.accuracy);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      latitude: lat,
      longitude: lng,
      accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
      city: String(parsed?.city || "") || undefined,
      state: String(parsed?.state || "") || undefined,
      country: String(parsed?.country || "") || undefined,
      pincode: String(parsed?.pincode || "") || undefined,
      source: "cache",
    };
  } catch {
    return null;
  }
};

const writeCachedLocation = (loc: UserLocation) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        pincode: loc.pincode,
        source: loc.source,
      })
    );
  } catch {
    // ignore
  }
};

const getApiBase = () => API_BASE_URL;

const syncLocationToBackend = async (loc: UserLocation) => {
  let token: string | null = null;
  try {
    token = localStorage.getItem("accessToken");
  } catch {
    token = null;
  }
  try {
    await fetch(`${String(getApiBase()).replace(/\/+$/, "")}/location/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        pincode: loc.pincode,
        source: loc.source || "gps",
      }),
    });
  } catch {
    // best-effort
  }
};


const distanceMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  // quick haversine in meters
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

interface LocationContextType {
  userLocation: UserLocation | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  locationSource: "gps" | "cache" | null;
  requestLocation: () => void;
  persistVisit: (meta?: { page?: string; shopSlug?: string }) => Promise<void>;
}

const LocationContext = createContext<LocationContextType>({
  userLocation: null,
  loading: true,
  error: null,
  permissionDenied: false,
  locationSource: null,
  requestLocation: () => {},
  persistVisit: async () => {},
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(() => {
    // If user already allowed location earlier, use cached value immediately.
    if (typeof window === "undefined") return null;
    return readCachedLocation();
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationSource, setLocationSource] = useState<"gps" | "cache" | null>(
    userLocation?.source || null
  );
  const [watching, setWatching] = useState(false);

  // Use refs for throttles/dedup to avoid rerender-driven loops and unstable callbacks.
  const lastWriteTsRef = useRef<number>(0);
  const lastPersistKeyRef = useRef<string | null>(null);
  const lastLocationSyncTsRef = useRef<number>(0);

  const maybeSyncLiveLocation = useCallback((loc: UserLocation) => {
    const now = Date.now();
    if (now - lastLocationSyncTsRef.current < LOCATION_SYNC_THROTTLE_MS) return;
    lastLocationSyncTsRef.current = now;
    syncLocationToBackend(loc);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      setLoading(false);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: "gps" as const,
        };
        setUserLocation(loc);
        setLocationSource("gps");
        writeCachedLocation(loc);
        maybeSyncLiveLocation(loc);
        setLoading(false);
        setPermissionDenied(false);
        setError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
        }
        setError("Location access denied");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [maybeSyncLiveLocation]);

  const startWatching = (): number | null => {
    if (watching) return null;
    if (!navigator.geolocation) return null;
    setWatching(true);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: "gps" as const,
        };

        setUserLocation((prev) => {
          if (!prev) return loc;
          const moved = distanceMeters(prev, loc);
          const acc = Math.max(Number(prev.accuracy) || 0, Number(loc.accuracy) || 0);
          const movedEnough = moved >= Math.max(LOCATION_DISTANCE_REFRESH_METERS, acc);
          const timeEnough = Date.now() - lastWriteTsRef.current >= LOCATION_SYNC_THROTTLE_MS;
          if (!movedEnough && !timeEnough) return prev;
          return loc;
        });
        const now = Date.now();
        // throttle localStorage writes
        if (now - lastWriteTsRef.current > 5000) {
          writeCachedLocation(loc);
          lastWriteTsRef.current = now;
        }
        maybeSyncLiveLocation(loc);
        setLoading(false);
        setPermissionDenied(false);
        setError(null);
        setLocationSource("gps");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
        }
        setError("Location access denied");
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return id;
  };

  useEffect(() => {
    // Start background watching only after we already have a GPS location.
    if (!userLocation || locationSource === "ip") return;

    const id = startWatching();
    return () => {
      if (id != null) {
        try {
          navigator.geolocation.clearWatch(id);
        } catch {
          // ignore
        }
      }
    };
  }, [userLocation, locationSource]);

  const persistVisit = useCallback(async (meta?: { page?: string; shopSlug?: string }) => {
    if (!userLocation) return;
    const page = meta?.page || 'unknown';
    const shopSlug = meta?.shopSlug || '';
    const key = `${page}::${shopSlug}`;
    if (lastPersistKeyRef.current === key) return;

    try {
      const apiBase = String(API_BASE_URL).replace(/\/+$/, "");
      await fetch(`${apiBase}/maps/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: userLocation.latitude,
          lng: userLocation.longitude,
          accuracyMeters: undefined,
          page,
          shopSlug: shopSlug || undefined,
          source: 'website',
        }),
      });
      lastPersistKeyRef.current = key;
    } catch {
      // best-effort
    }
  }, [userLocation]);

  return (
    <LocationContext.Provider value={{ userLocation, loading, error, permissionDenied, locationSource, requestLocation, persistVisit }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useUserLocation() {
  return useContext(LocationContext);
}

// Haversine formula - returns distance in km
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
