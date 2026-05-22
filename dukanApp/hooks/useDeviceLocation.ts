import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { apiRequest } from "@/utils/apiClient";
import { Storage } from "@/utils/storage";
import { distanceMeters } from "@/utils/geo";

export type DeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  source?: "gps" | "cache";
};

const STORAGE_KEY = "apnidukan:device_location:v1";
const LOCATION_REFRESH_MS = 30000;
const LOCATION_REFRESH_METERS = 100;

const readCached = async (): Promise<DeviceLocation | null> => {
  try {
    const raw = await Storage.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lat = Number(parsed?.latitude);
    const lng = Number(parsed?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      latitude: lat,
      longitude: lng,
      accuracy: Number(parsed?.accuracy) || undefined,
      city: parsed?.city || undefined,
      state: parsed?.state || undefined,
      country: parsed?.country || undefined,
      pincode: parsed?.pincode || undefined,
      source: "cache",
    };
  } catch {
    return null;
  }
};

const writeCached = async (loc: DeviceLocation) => {
  try {
    await Storage.setItemAsync(
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


const syncLocation = async (loc: DeviceLocation, accessToken?: string | null) => {
  try {
    await apiRequest("/location/update", {
      method: "POST",
      accessToken: accessToken || undefined,
      body: JSON.stringify({
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        pincode: loc.pincode,
        source: loc.source || "gps",
        page: "app",
      }),
    });
  } catch {
    // best-effort
  }
};

export function useDeviceLocation(accessToken?: string | null) {
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastEmitRef = useRef<number>(0);
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    readCached().then((cached) => {
      if (cached) setLocation(cached);
    });
  }, []);

  const resolveReverseGeocode = async (coords: { latitude: number; longitude: number }) => {
    try {
      const rows = await Location.reverseGeocodeAsync(coords);
      const first = rows?.[0];
      if (!first) return {} as Partial<DeviceLocation>;
      return {
        city: first.city || undefined,
        state: first.region || undefined,
        country: first.country || undefined,
        pincode: first.postalCode || undefined,
      };
    } catch {
      return {} as Partial<DeviceLocation>;
    }
  };

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      setPermissionDenied(true);
      setError("Location permission denied");
      setLoading(false);
      return;
    }

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const meta = await resolveReverseGeocode(pos.coords);
    const next: DeviceLocation = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      source: "gps",
      ...meta,
    };
    setLocation(next);
    await writeCached(next);
    await syncLocation(next, accessToken);
    setPermissionDenied(false);
    setLoading(false);
  }, [accessToken]);

  const startWatching = useCallback(async () => {
    if (watchSubRef.current) return;
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== "granted") return;

    watchSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_REFRESH_MS,
        distanceInterval: LOCATION_REFRESH_METERS,
      },
      async (pos) => {
        const next: DeviceLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: "gps",
        };

        setLocation((prev) => {
          if (!prev) return next;
          const moved = distanceMeters(prev, next);
          const timeEnough = Date.now() - lastEmitRef.current >= LOCATION_REFRESH_MS;
          if (moved < LOCATION_REFRESH_METERS && !timeEnough) return prev;
          return next;
        });

        lastEmitRef.current = Date.now();
        await writeCached(next);
        syncLocation(next, accessToken);
      }
    );
  }, [accessToken]);

  useEffect(() => {
    if (!location) return;
    startWatching();
    return () => {
      watchSubRef.current?.remove();
      watchSubRef.current = null;
    };
  }, [location, startWatching]);

  return { location, loading, permissionDenied, error, requestLocation };
}
