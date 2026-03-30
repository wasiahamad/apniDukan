import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { businessApi, type Business } from "@/lib/api/business";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const isValidLat = (n: number) => Number.isFinite(n) && n >= -90 && n <= 90;
const isValidLng = (n: number) => Number.isFinite(n) && n >= -180 && n <= 180;

const LocationPage = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [business, setBusiness] = useState<Business | null>(null);
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await businessApi.getMyBusinesses({ force: true });
        if (cancelled) return;
        const b = (res.success ? res.data?.[0] : null) || null;
        setBusiness(b);

        const coords = (b as any)?.address?.location?.coordinates;
        if (Array.isArray(coords) && coords.length === 2) {
          setLng(String(coords[0]));
          setLat(String(coords[1]));
        } else if (b?.address?.coordinates) {
          setLat(String(b.address.coordinates.latitude));
          setLng(String(b.address.coordinates.longitude));
        }

        setSearchText([b?.address?.street, b?.address?.city, b?.address?.state].filter(Boolean).join(", "));
      } catch (err: any) {
        toast({
          title: "Failed to load business",
          description: err?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const numericLat = useMemo(() => Number(lat), [lat]);
  const numericLng = useMemo(() => Number(lng), [lng]);

  const hasValidCoords = isValidLat(numericLat) && isValidLng(numericLng);

  const mapEmbedUrl = useMemo(() => {
    if (!hasValidCoords) return null;
    // Simple embed that works without extra libraries; stays inside the app.
    // Note: key is optional for basic embed but recommended; keep it in env.
    const center = `${numericLat},${numericLng}`;
    if (GOOGLE_MAPS_API_KEY) {
      return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(
        GOOGLE_MAPS_API_KEY
      )}&q=${encodeURIComponent(center)}&zoom=16`;
    }
    return `https://www.google.com/maps?q=${encodeURIComponent(center)}&z=16&output=embed`;
  }, [hasValidCoords, numericLat, numericLng]);

  const autoDetect = async () => {
    if (!navigator.geolocation) {
      toast({ title: "Not supported", description: "Geolocation is not supported in this browser.", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = clamp(pos.coords.latitude, -90, 90);
        const lo = clamp(pos.coords.longitude, -180, 180);
        setLat(String(la));
        setLng(String(lo));
      },
      () => {
        toast({ title: "Permission denied", description: "Please allow location access and try again.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const geocodeSearch = async () => {
    if (!GOOGLE_MAPS_API_KEY) {
      toast({
        title: "Missing key",
        description: "VITE_GOOGLE_MAPS_API_KEY is not set.",
        variant: "destructive",
      });
      return;
    }
    const q = searchText.trim();
    if (!q) return;

    try {
      setSearching(true);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${encodeURIComponent(
        GOOGLE_MAPS_API_KEY
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      const loc = data?.results?.[0]?.geometry?.location;
      const la = Number(loc?.lat);
      const lo = Number(loc?.lng);
      if (!isValidLat(la) || !isValidLng(lo)) {
        throw new Error("Location not found");
      }
      setLat(String(la));
      setLng(String(lo));
    } catch (err: any) {
      toast({ title: "Search failed", description: err?.message || "Try a different place name.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const saveLocation = async () => {
    if (!business?._id) return;
    if (!hasValidCoords) {
      toast({ title: "Invalid", description: "Please set valid latitude and longitude.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        address: {
          ...(business.address || {}),
          location: {
            type: "Point",
            coordinates: [numericLng, numericLat],
          },
        },
      };
      const res = await businessApi.updateBusiness(business._id, payload);
      if (!res.success) throw new Error(res.message || "Failed to save");
      toast({ title: "Saved", description: "Location updated successfully." });
      // refresh local snapshot
      setBusiness(res.data || business);
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Location & Map</h1>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-sm">Search location</h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search place name (e.g., Malviya Nagar, Jaipur)"
              disabled={loading}
            />
          </div>
          <Button variant="outline" onClick={geocodeSearch} disabled={loading || searching} className="gap-2">
            <Search className="w-4 h-4" /> Search
          </Button>
        </div>

        <h3 className="font-bold text-sm">Coordinates</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Latitude</label>
            <Input value={lat} onChange={(e) => setLat(e.target.value)} disabled={loading} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Longitude</label>
            <Input value={lng} onChange={(e) => setLng(e.target.value)} disabled={loading} />
          </div>
        </div>
        <button
          type="button"
          onClick={autoDetect}
          className="flex items-center gap-2 text-sm text-primary font-medium"
          disabled={loading}
        >
          <Navigation className="w-4 h-4" /> Auto-detect Location
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {mapEmbedUrl ? (
          <iframe title="Map Preview" src={mapEmbedUrl} className="h-64 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        ) : (
          <div className="h-64 bg-muted flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MapPin className="w-10 h-10 mx-auto mb-2 text-primary" />
              <p className="text-sm">Map Preview</p>
              <p className="text-xs text-muted-foreground">Set coordinates to preview</p>
            </div>
          </div>
        )}
      </div>

      <motion.div whileTap={{ scale: 0.97 }}>
        <Button className="w-full py-6 rounded-xl font-semibold" onClick={saveLocation} disabled={loading || saving || !business?._id}>
          Save Location
        </Button>
      </motion.div>
    </div>
  );
};

export default LocationPage;
