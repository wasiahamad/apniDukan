import { useState, useEffect, createContext, useContext, ReactNode } from "react";

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

const STORAGE_KEY = "dukandirect:userLocation:v1";
const LOCATION_SYNC_THROTTLE_MS = 15000;

const readCachedLocation = (): UserLocation | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lat = Number(parsed?.latitude);
    const lng = Number(parsed?.longitude);
    const accuracy = Number(parsed?.accuracy);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { latitude: lat, longitude: lng, accuracy: Number.isFinite(accuracy) ? accuracy : undefined };
  } catch {
    return null;
  }
};

const writeCachedLocation = (loc: UserLocation) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy })
    );
  } catch {
    // ignore
  }
};

const getApiBase = () => {
  const env = import.meta as any;
  return env?.env?.VITE_API_URL || env?.env?.VITE_API_BASE_URL || env?.env?.VITE_BACKEND_URL || "http://localhost:5000/api";
};

const syncLocationToBackend = async (loc: UserLocation) => {
  let token: string | null = null;
  try {
    token = localStorage.getItem("accessToken");
  } catch {
    token = null;
  }
  if (!token) return;

  try {
    await fetch(`${String(getApiBase()).replace(/\/+$/, "")}/auth/location`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
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
  requestLocation: () => void;
  persistVisit: (meta?: { page?: string; shopSlug?: string }) => Promise<void>;
}

const LocationContext = createContext<LocationContextType>({
  userLocation: null,
  loading: true,
  error: null,
  permissionDenied: false,
  requestLocation: () => {},
  persistVisit: async () => {},
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(() => {
    // If user already allowed location earlier, use cached value immediately.
    if (typeof window === "undefined") return null;
    return readCachedLocation();
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [watching, setWatching] = useState(false);
  const [lastWriteTs, setLastWriteTs] = useState<number>(0);
  const [lastPersistKey, setLastPersistKey] = useState<string | null>(null);
  const [lastLocationSyncTs, setLastLocationSyncTs] = useState<number>(0);

  const maybeSyncLiveLocation = (loc: UserLocation) => {
    const now = Date.now();
    if (now - lastLocationSyncTs < LOCATION_SYNC_THROTTLE_MS) return;
    syncLocationToBackend(loc);
    setLastLocationSyncTs(now);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      setLoading(false);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setUserLocation(loc);
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
  };

  const startWatching = (): number | null => {
    if (watching) return null;
    if (!navigator.geolocation) return null;
    setWatching(true);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setUserLocation((prev) => {
          if (!prev) return loc;
          const moved = distanceMeters(prev, loc);
          const acc = Math.max(Number(prev.accuracy) || 0, Number(loc.accuracy) || 0);
          // Ignore jitter: if movement is smaller than accuracy (or < 15m), don't update.
          if (moved < Math.max(15, acc)) return prev;
          return loc;
        });
        const now = Date.now();
        // throttle localStorage writes
        if (now - lastWriteTs > 5000) {
          writeCachedLocation(loc);
          setLastWriteTs(now);
        }
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
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return id;
  };

  useEffect(() => {
    requestLocation();
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
  }, []);

  const persistVisit = async (meta?: { page?: string; shopSlug?: string }) => {
    if (!userLocation) return;
    const page = meta?.page || 'unknown';
    const shopSlug = meta?.shopSlug || '';
    const key = `${page}::${shopSlug}`;
    if (lastPersistKey === key) return;

    try {
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000/api';
      await fetch(`${String(apiBase).replace(/\/+$/, '')}/maps/visit`, {
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
      setLastPersistKey(key);
    } catch {
      // best-effort
    }
  };

  return (
    <LocationContext.Provider value={{ userLocation, loading, error, permissionDenied, requestLocation, persistVisit }}>
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
