import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, MessageCircle, Phone, MapPin, Clock, BadgeCheck, CreditCard, Navigation, Navigation2, Share2, Calendar, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import PageTransition from "@/components/PageTransition";
import ScrollReveal from "@/components/ScrollReveal";
import StaggerChildren, { StaggerItem } from "@/components/StaggerChildren";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import StoriesTray from "@/components/StoriesTray";
import AiChatWidget from "@/components/AiChatWidget";
import { motion } from "framer-motion";
import { type Product } from "@/data/mockData";
import { useEffect } from "react";
import { useUserLocation, getDistanceKm, formatDistance } from "@/hooks/useUserLocation";
import { API_BASE_URL, fetchRoute, hasAuthSession, hasDevanagari } from "@/lib/publicShopsApi";
import { bookPublicSlotBySlug, fetchActiveStories, fetchBookingSlotsBySlug, fetchBusinessDistance, fetchPublicListingsForShop, fetchPublicOffersForBusiness, fetchPublicShopBySlug } from "@/lib/publicShopsApi";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { decodePolyline, loadGoogleMaps } from "@/lib/googleMaps";

type PublicReview = {
  _id: string;
  customerName?: string;
  rating: number;
  comment?: string;
  createdAt: string;
};

type ReviewSummaryResponse = {
  success: boolean;
  message?: string;
  data?: {
    avgRating: number;
    reviewsCount: number;
  };
};

type ReviewsListResponse = {
  success: boolean;
  message?: string;
  data?: PublicReview[];
};

type CreateReviewResponse = {
  success: boolean;
  message?: string;
  data?: PublicReview;
};

const fetchReviewSummaryBySlug = async (slug: string) => {
  const response = await fetch(`${API_BASE_URL}/reviews/business/${encodeURIComponent(slug)}/summary`);
  const json = (await response.json()) as ReviewSummaryResponse;
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.message || "Failed to load review summary");
  }
  return json.data;
};

const fetchReviewsBySlug = async (slug: string, limit = 10) => {
  const q = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/reviews/business/${encodeURIComponent(slug)}?${q.toString()}`);
  const json = (await response.json()) as ReviewsListResponse;
  if (!response.ok || !json.success) {
    throw new Error(json.message || "Failed to load reviews");
  }
  return json.data || [];
};

const createReviewBySlug = async (slug: string, payload: { rating: number; comment?: string }) => {
  if (!hasAuthSession()) {
    const err: any = new Error("Login required");
    err.status = 401;
    throw err;
  }

  const token = (() => {
    try {
      return localStorage.getItem("accessToken");
    } catch {
      return null;
    }
  })();

  const response = await fetch(`${API_BASE_URL}/reviews/business/${encodeURIComponent(slug)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    }
  );
  const json = (await response.json()) as CreateReviewResponse;

  if (response.status === 401) {
    const err: any = new Error(json.message || "Login required");
    err.status = 401;
    throw err;
  }

  if (!response.ok || !json.success) {
    throw new Error(json.message || "Failed to submit review");
  }
  return json.data;
};

const formatReviewDate = (value?: string) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

const StarsRow = ({ rating, size = 16 }: { rating: number; size?: number }) => {
  const safe = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`${safe} out of 5`}>
      {Array.from({ length: 5 }).map((_, idx) => {
        const filled = idx + 1 <= safe;
        return (
          <Star
            key={idx}
            size={size}
            className={filled ? "fill-secondary text-secondary" : "text-muted-foreground"}
          />
        );
      })}
    </div>
  );
};

const distanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

const formatDurationSeconds = (totalSeconds: number) => {
  if (!Number.isFinite(totalSeconds)) return null;
  const secs = Math.max(0, Math.round(totalSeconds));

  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);

  // Always show minutes+seconds for a consistent day/hour/min/sec format.
  // Example: 1h 0m 0s, 2d 3h 4m 5s
  if (days || hours) {
    parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(" ");
  }

  // Less than 1 hour
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
};

export default function ShopPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { userLocation, permissionDenied, requestLocation, persistVisit } = useUserLocation();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const fullMapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const fullMapInstanceRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const fullRoutePolylineRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const shopMarkerRef = useRef<any>(null);
  const fullUserMarkerRef = useRef<any>(null);
  const fullShopMarkerRef = useRef<any>(null);
  const lastRerouteFromRef = useRef<{ lat: number; lng: number } | null>(null);
  const [fullMapOpen, setFullMapOpen] = useState(false);

  useEffect(() => {
    // Ask for location as soon as user opens the shop page.
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (!userLocation) return;
    persistVisit({ page: 'shop', shopSlug: shopSlug || undefined });
  }, [userLocation, persistVisit, shopSlug]);
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const closeSelectedProduct = () => {
    setSelectedProduct(null);

    // If this dialog was opened via a shared/story link (?listing=...),
    // remove the query param so the dialog doesn't auto-open again.
    const params = new URLSearchParams(location.search || "");
    if (!params.has("listing")) return;
    params.delete("listing");
    const next = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: next ? `?${next}` : "",
      },
      { replace: true }
    );
  };

  const [logoStoriesOpen, setLogoStoriesOpen] = useState(false);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingListingId, setBookingListingId] = useState<string>("");
  const [nowTick, setNowTick] = useState(0);

  // Booking state
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  useEffect(() => {
    if (!bookingOpen) return;
    const id = window.setInterval(() => setNowTick((v) => v + 1), 30_000);
    return () => window.clearInterval(id);
  }, [bookingOpen]);

  const isTodaySelected = useMemo(() => {
    if (!bookingDate) return false;
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return bookingDate === `${yyyy}-${mm}-${dd}`;
  }, [bookingDate, nowTick]);

  const cutoffMinutes = useMemo(() => {
    if (!isTodaySelected) return null;
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, [isTodaySelected, nowTick]);

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const shopPublicUrl = useMemo(() => {
    if (!shopSlug) return "";

    // Production requirement: dukandar personal website should be on subdomain.
    if (import.meta.env.PROD) {
      return `https://${shopSlug}.publicdukan.com`;
    }

    const rawBase = String(import.meta.env.VITE_STOREFRONT_URL || "").trim();
    const prodFallback = "https://publicdukan.com";
    const devFallback = "http://localhost:8080";
    const fallbackBase = import.meta.env.DEV ? devFallback : prodFallback;

    const isLocalhost = (v: string) => {
      const s = String(v || '').trim();
      if (!s) return false;
      const withProtocol = /^(https?:)?\/\//i.test(s) ? s : `http://${s}`;
      try {
        const u = new URL(withProtocol);
        return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
      } catch {
        return /localhost|127\.0\.0\.1/i.test(s);
      }
    };

    const effectiveRawBase = import.meta.env.PROD && isLocalhost(rawBase) ? "" : rawBase;

    // If env is missing, or malformed like "slug/localhost:8080", fall back.
    const candidate =
      !effectiveRawBase ||
      (!/^(https?:)?\/\//i.test(effectiveRawBase) && /[\\/]/.test(effectiveRawBase))
        ? fallbackBase
        : effectiveRawBase;

    const withProtocol = /^(https?:)?\/\//i.test(candidate)
      ? candidate
      : `${import.meta.env.DEV ? 'http' : 'https'}://${candidate}`;

    try {
      const parsed = new URL(withProtocol);
      const normalizedBase = `${parsed.protocol}//${parsed.host}`.replace(/\/\/+$/, "");
      const hostname = String(parsed.hostname || "").toLowerCase();

      // Preferred format in production: shopSlug.publicdukan.com
      if (!import.meta.env.DEV && (hostname === "publicdukan.com" || hostname === "www.publicdukan.com")) {
        return `${parsed.protocol}//${shopSlug}.publicdukan.com`;
      }
      if (!import.meta.env.DEV && hostname.endsWith(".publicdukan.com") && !hostname.startsWith("seller.") && !hostname.startsWith("admin.")) {
        const root = hostname.replace(/^www\./, "");
        return `${parsed.protocol}//${shopSlug}.${root}`;
      }

      // Fallback: same-host path route (publicWebsite supports /:shopSlug)
      return `${normalizedBase}/${shopSlug}`;
    } catch {
      return `${fallbackBase}/${shopSlug}`;
    }
  }, [shopSlug]);

  const shopQuery = useQuery({
    queryKey: ["public-shop-by-slug", i18n.language, shopSlug],
    queryFn: () => fetchPublicShopBySlug(shopSlug || ""),
    enabled: !!shopSlug,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  if (!hasAuthSession()) {
    return <Navigate to="/login" replace state={{ from: location, authRequired: true }} />;
  }

  const websiteLink = useMemo(() => {
    const canOpen = !!shopQuery.data?.subdomainActive;
    return canOpen ? shopPublicUrl : "";
  }, [shopPublicUrl, shopQuery.data?.subdomainActive]);

  const isNonShareableLocalUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.hostname === "localhost" || u.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  };

  const shareShopLink = async (title?: string) => {
    if (!websiteLink) return;

    if (isNonShareableLocalUrl(websiteLink)) {
      toast({
        title: t("shopPage.share.notPublicTitle"),
        description: t("shopPage.share.notPublicDesc"),
        variant: "destructive",
      });
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: title || t("shopPage.share.defaultShareTitle"), url: websiteLink });
        return;
      }

      await navigator.clipboard?.writeText(websiteLink);
      toast({
        title: t("shopPage.share.copiedTitle"),
        description: websiteLink,
      });
    } catch {
      toast({
        title: t("shopPage.share.copyFailedTitle"),
        description: websiteLink,
        variant: "destructive",
      });
    }
  };

  const reviewsListQuery = useQuery({
    queryKey: ["public-reviews-by-slug", shopSlug],
    queryFn: () => fetchReviewsBySlug(shopSlug || "", 10),
    enabled: !!shopSlug,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });

  const listingsQuery = useQuery({
    queryKey: ["public-shop-listings", i18n.language, shopQuery.data?.id],
    queryFn: () => fetchPublicListingsForShop(shopQuery.data?.id || ""),
    enabled: !!shopQuery.data?.id,
  });

  const offersQuery = useQuery({
    queryKey: ["public-shop-offers", i18n.language, shopQuery.data?.id],
    queryFn: () => fetchPublicOffersForBusiness(shopQuery.data?.id || ""),
    enabled: !!shopQuery.data?.id,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });

  const shopStoriesQuery = useQuery({
    queryKey: ["public-stories-by-business", shopQuery.data?.id, "story"],
    queryFn: () => fetchActiveStories("story", shopQuery.data?.id || ""),
    enabled: !!shopQuery.data?.id,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });

  const slotsQuery = useQuery({
    queryKey: ["booking-slots", shopSlug, bookingDate],
    queryFn: () => fetchBookingSlotsBySlug(shopSlug || "", bookingDate),
    enabled: !!shopSlug && !!bookingDate,
    staleTime: 10_000,
  });

  const visibleSlots = useMemo(() => {
    const all = slotsQuery.data || [];
    if (!isTodaySelected) return all;
    if (cutoffMinutes == null) return all;
    return all.filter((s) => {
      const [h, m] = String(s.startTime || "").split(":").map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
      return h * 60 + m > cutoffMinutes;
    });
  }, [slotsQuery.data, isTodaySelected, cutoffMinutes]);

  useEffect(() => {
    // Reset selected slot when date changes
    setSelectedStartTime(null);
  }, [bookingDate]);

  useEffect(() => {
    if (!selectedStartTime) return;
    if (!isTodaySelected) return;
    if (cutoffMinutes == null) return;
    const [h, m] = String(selectedStartTime || "").split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
    const startMin = h * 60 + m;
    if (startMin <= cutoffMinutes) setSelectedStartTime(null);
  }, [selectedStartTime, isTodaySelected, cutoffMinutes]);

  useEffect(() => {
    if (!selectedStartTime) return;
    const stillVisible = visibleSlots.some((s) => String(s.startTime) === String(selectedStartTime));
    if (!stillVisible) setSelectedStartTime(null);
  }, [selectedStartTime, visibleSlots]);

  const formatTime12h = (time: string) => {
    const [h, m] = String(time || "").split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const submitBooking = async () => {
    if (!shopSlug) return;

    if (!hasAuthSession()) {
      toast({
        title: t("shopPage.auth.loginRequiredTitle"),
        description: t("shopPage.booking.loginRequiredDesc"),
        variant: "destructive",
      });
      navigate("/login", { replace: true, state: { from: location, authRequired: true } });
      return;
    }
    if (!bookingDate) {
      toast({ title: t("shopPage.booking.dateRequiredTitle"), variant: "destructive" });
      return;
    }
    if (!selectedStartTime) {
      toast({ title: t("shopPage.booking.selectTimeSlotTitle"), variant: "destructive" });
      return;
    }

    const selectedVisible = visibleSlots.find((s) => String(s.startTime) === String(selectedStartTime));
    const selectedIsAvailable = selectedVisible && !selectedVisible.isBooked && String(selectedVisible.status || "") === "available";
    if (!selectedVisible || !selectedIsAvailable) {
      toast({ title: t("shopPage.booking.selectValidFutureSlotTitle"), variant: "destructive" });
      return;
    }

    try {
      setBookingSubmitting(true);
        await bookPublicSlotBySlug(shopSlug, {
          date: bookingDate,
          startTime: selectedStartTime,
          customerNotes: bookingNotes.trim() || undefined,
          listingId: bookingListingId ? bookingListingId : undefined,
        });
      toast({
        title: t("shopPage.booking.confirmedTitle"),
        description: t("shopPage.booking.confirmedDesc"),
      });
      setSelectedStartTime(null);
      setBookingNotes("");
      setBookingListingId("");
      await slotsQuery.refetch();

      setBookingOpen(false);
    } catch (err: any) {
      toast({
        title: t("shopPage.booking.failedTitle"),
        description:
          i18n.language === "en"
            ? (err?.message || t("shopPage.generic.tryAgain"))
            : t("shopPage.generic.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setBookingSubmitting(false);
    }
  };

  const distanceEtaQuery = useQuery({
    queryKey: ["public-shop-distance", shopQuery.data?.id, userLocation?.latitude ?? null, userLocation?.longitude ?? null],
    queryFn: () =>
      fetchBusinessDistance(shopQuery.data?.id || "", {
        lat: userLocation!.latitude,
        lng: userLocation!.longitude,
      }),
    enabled: !!shopQuery.data?.id && !!userLocation,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  const routeQuery = useQuery({
    queryKey: ["public-shop-route", shopQuery.data?.id, userLocation?.latitude ?? null, userLocation?.longitude ?? null],
    queryFn: () =>
      fetchRoute({
        origin: { lat: userLocation!.latitude, lng: userLocation!.longitude },
        destination: { lat: shopQuery.data!.latitude, lng: shopQuery.data!.longitude },
      }),
    enabled: !!shopQuery.data?.id && !!userLocation && !!mapsKey,
    staleTime: 30_000,
    refetchInterval: (q) => {
      const anyErr: any = q.state.error;
      const msg = String(anyErr?.message || '');
      // If backend doesn't have key configured (or other non-retryable), don't spam retries.
      if (msg.includes('MAPS_KEY_MISSING') || msg.includes('not configured')) return false;
      return 30_000;
    },
    refetchIntervalInBackground: true,
  });

  // Reroute only when user moved enough (Zomato-like, avoids jitter/spam)
  useEffect(() => {
    if (!userLocation) return;
    if (!shopQuery.data?.id) return;
    if (!mapsKey) return;

    const cur = { lat: userLocation.latitude, lng: userLocation.longitude };
    const last = lastRerouteFromRef.current;
    if (!last) {
      lastRerouteFromRef.current = cur;
      routeQuery.refetch();
      return;
    }

    const moved = distanceMeters(last, cur);
    // If accuracy is poor, require more movement.
    const acc = Number((userLocation as any)?.accuracy) || 0;
    const threshold = Math.max(80, acc * 2);
    if (moved >= threshold) {
      lastRerouteFromRef.current = cur;
      routeQuery.refetch();
    }
  }, [userLocation, shopQuery.data?.id, mapsKey]);

  useEffect(() => {
    const key = mapsKey;
    const shopData = shopQuery.data;
    if (!key) return;
    if (!shopData) return;
    if (!mapRef.current) return;

    const destination = { lat: Number(shopData.latitude), lng: Number(shopData.longitude) };
    const origin = userLocation ? { lat: Number(userLocation.latitude), lng: Number(userLocation.longitude) } : null;

    const run = async () => {
      try {
        await loadGoogleMaps(key);
        if (!mapRef.current) return;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: origin || destination,
            zoom: 14,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          });
        }

        // Markers (update existing instead of creating duplicates)
        if (!shopMarkerRef.current) {
          shopMarkerRef.current = new window.google.maps.Marker({
            position: destination,
            map: mapInstanceRef.current,
            title: shopData.name,
            icon: {
              url: 'https://maps.google.com/mapfiles/kml/shapes/homegardenbusiness.png',
              scaledSize: new window.google.maps.Size(32, 32),
            },
          });
        } else {
          shopMarkerRef.current.setPosition(destination);
        }

        if (origin) {
          if (!userMarkerRef.current) {
            userMarkerRef.current = new window.google.maps.Marker({
              position: origin,
              map: mapInstanceRef.current,
              title: 'You',
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillOpacity: 1,
                strokeWeight: 2,
              },
            });
          } else {
            userMarkerRef.current.setPosition(origin);
          }
        }

        // Route polyline
        const polylineStr = routeQuery.data?.polyline;
        if (polylineStr) {
          const decoded = decodePolyline(polylineStr).map(p => ({ lat: p.lat, lng: p.lng }));
          if (routePolylineRef.current) {
            routePolylineRef.current.setMap(null);
            routePolylineRef.current = null;
          }

          routePolylineRef.current = new window.google.maps.Polyline({
            path: decoded,
            geodesic: true,
            strokeOpacity: 0.9,
            strokeWeight: 5,
          });
          routePolylineRef.current.setMap(mapInstanceRef.current);

          const bounds = new window.google.maps.LatLngBounds();
          decoded.forEach((p: any) => bounds.extend(p));
          mapInstanceRef.current.fitBounds(bounds);
        } else {
          mapInstanceRef.current.setCenter(origin || destination);
          mapInstanceRef.current.setZoom(14);
        }
      } catch {
        // ignore; UI falls back to embed when mapsKey missing
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey, shopQuery.data?.id, shopQuery.data?.latitude, shopQuery.data?.longitude, userLocation?.latitude, userLocation?.longitude, routeQuery.data?.polyline]);

  useEffect(() => {
    const key = mapsKey;
    const shopData = shopQuery.data;
    if (!fullMapOpen) return;
    if (!key) return;
    if (!shopData) return;
    if (!fullMapRef.current) return;

    const destination = { lat: Number(shopData.latitude), lng: Number(shopData.longitude) };
    const origin = userLocation ? { lat: Number(userLocation.latitude), lng: Number(userLocation.longitude) } : null;

    const run = async () => {
      try {
        await loadGoogleMaps(key);
        if (!fullMapRef.current) return;

        if (!fullMapInstanceRef.current) {
          fullMapInstanceRef.current = new window.google.maps.Map(fullMapRef.current, {
            center: origin || destination,
            zoom: 15,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          });
        }

        if (!fullShopMarkerRef.current) {
          fullShopMarkerRef.current = new window.google.maps.Marker({
            position: destination,
            map: fullMapInstanceRef.current,
            title: shopData.name,
            icon: {
              url: 'https://maps.google.com/mapfiles/kml/shapes/homegardenbusiness.png',
              scaledSize: new window.google.maps.Size(36, 36),
            },
          });
        } else {
          fullShopMarkerRef.current.setPosition(destination);
        }

        if (origin) {
          if (!fullUserMarkerRef.current) {
            fullUserMarkerRef.current = new window.google.maps.Marker({
              position: origin,
              map: fullMapInstanceRef.current,
              title: 'You',
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillOpacity: 1,
                strokeWeight: 2,
              },
            });
          } else {
            fullUserMarkerRef.current.setPosition(origin);
          }
        }

        const polylineStr = routeQuery.data?.polyline;
        if (polylineStr) {
          const decoded = decodePolyline(polylineStr).map((p) => ({ lat: p.lat, lng: p.lng }));
          if (fullRoutePolylineRef.current) {
            fullRoutePolylineRef.current.setMap(null);
            fullRoutePolylineRef.current = null;
          }

          fullRoutePolylineRef.current = new window.google.maps.Polyline({
            path: decoded,
            geodesic: true,
            strokeOpacity: 0.9,
            strokeWeight: 6,
          });
          fullRoutePolylineRef.current.setMap(fullMapInstanceRef.current);

          const bounds = new window.google.maps.LatLngBounds();
          decoded.forEach((p: any) => bounds.extend(p));
          fullMapInstanceRef.current.fitBounds(bounds);
        } else {
          // Fallback: fit origin+destination so map never zooms out to world view on refresh.
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(destination);
          if (origin) bounds.extend(origin);
          fullMapInstanceRef.current.fitBounds(bounds);
        }
      } catch {
        // ignore
      }
    };

    run();
  }, [fullMapOpen, mapsKey, shopQuery.data?.id, shopQuery.data?.latitude, shopQuery.data?.longitude, userLocation?.latitude, userLocation?.longitude, routeQuery.data?.polyline]);

  const shop = shopQuery.data
    ? {
        ...shopQuery.data,
        products: (listingsQuery.data || []).filter((p: any) => p?.isFeatured === true),
      }
    : null;

  const bookableItems = useMemo(() => {
    const all = (listingsQuery.data || []) as Product[];
    return all;
  }, [listingsQuery.data]);

  const hasActiveStory = Array.isArray(shopStoriesQuery.data) && shopStoriesQuery.data.length > 0;

  useEffect(() => {
    const listingId = new URLSearchParams(location.search || "").get("listing");
    if (!listingId) return;
    if (selectedProduct) return;

    const all = (listingsQuery.data || []) as Product[];
    const candidates = all.length > 0 ? all : (shop?.products || []);
    if (candidates.length === 0) return;

    const found = candidates.find((p) => String(p.id) === String(listingId));
    if (found) {
      setSelectedProduct(found);
    }
  }, [location.search, selectedProduct, listingsQuery.data, shop?.products]);

  const ownerName = shop?.ownerName || t("shopPage.owner.fallbackName");
  const ownerPhone = shop?.ownerPhone || shop?.phone || "";
  const ownerEmail = shop?.ownerEmail || "";

  if (shopQuery.isLoading) {
    return (
      <div className="container py-10 space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (shopQuery.isError) {
    const status = (shopQuery.error as any)?.status;
    if (status === 401) {
      return <Navigate to="/login" replace state={{ from: location, authRequired: true }} />;
    }

    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold">{t("shopPage.errors.couldNotLoadShopTitle")}</h1>
        <p className="text-muted-foreground mt-2">
          {i18n.language === "en" && shopQuery.error instanceof Error && shopQuery.error.message
            ? shopQuery.error.message
            : t("shopPage.generic.somethingWentWrong")}
        </p>
        <button onClick={() => shopQuery.refetch()} className="text-primary mt-4 inline-block">
          {t("shopPage.actions.retry")}
        </button>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold">{t("shopPage.notFound.title")}</h1>
        <Link to="/" className="text-primary mt-4 inline-block">
          {t("shopPage.notFound.backHome")}
        </Link>
      </div>
    );
  }

  const mapUrl = `https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`;
  const distance = userLocation
    ? getDistanceKm(userLocation.latitude, userLocation.longitude, shop.latitude, shop.longitude)
    : null;
  const distanceKm = distanceEtaQuery.data?.distanceKm ?? distance;
  const etaSeconds =
    (routeQuery.data?.durationSeconds && Number(routeQuery.data.durationSeconds))
      ? Number(routeQuery.data.durationSeconds)
      : (distanceEtaQuery.data?.durationSeconds && Number(distanceEtaQuery.data.durationSeconds))
        ? Number(distanceEtaQuery.data.durationSeconds)
        : (distanceEtaQuery.data?.durationMins != null ? Number(distanceEtaQuery.data.durationMins) * 60 : null);
  const distanceEtaLabel = (() => {
    if (distanceKm == null) return null;
    const etaLabel = etaSeconds == null ? null : formatDurationSeconds(etaSeconds);
    if (!etaLabel) return t("shopPage.distance.awayFromYou", { distance: formatDistance(distanceKm) });
    return `${formatDistance(distanceKm)} • ${etaLabel}`;
  })();

  const directionsEmbedUrl = (() => {
    const dest = `${shop.latitude},${shop.longitude}`;
    const origin = userLocation ? `${userLocation.latitude},${userLocation.longitude}` : undefined;
    if (mapsKey) {
      const base = `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(mapsKey)}`;
      const originPart = origin ? `&origin=${encodeURIComponent(origin)}` : "";
      return `${base}${originPart}&destination=${encodeURIComponent(dest)}&mode=driving`;
    }
    // Fallback without API key: show place embed
    return `https://www.google.com/maps?q=${encodeURIComponent(dest)}&z=16&output=embed`;
  })();

  const trackAction = async (action: "whatsapp" | "call" | "map") => {
    try {
      await fetch(`${API_BASE_URL}/business/slug/${encodeURIComponent(shop.slug)}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      // Best-effort: remember last "map" intent so WhatsApp orders can be tagged as origin=map.
      if (action === 'map') {
        try {
          sessionStorage.setItem(
            'publicdukan:last_map_click',
            JSON.stringify({ shopSlug: shop.slug, ts: Date.now() })
          );
        } catch {
          // ignore
        }
      }
    } catch {
      // best-effort
    }
  };

  const listingsTitle = (() => {
    const type = shop.suggestedListingType;
    if (type === "food") return t("shopPage.listingsTitle.food");
    if (type === "course") return t("shopPage.listingsTitle.course");
    if (type === "rental") return t("shopPage.listingsTitle.rental");
    if (type === "service") return t("shopPage.listingsTitle.service");
    if (type === "product") return t("shopPage.listingsTitle.product");
    return t("shopPage.listingsTitle.default");
  })();

  const submitReview = async () => {
    if (!shopSlug) return;
    const rating = Math.min(5, Math.max(1, Math.round(Number(reviewRating) || 0)));
    const comment = String(reviewComment || "").trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      toast({
        title: t("shopPage.reviews.ratingRequiredTitle"),
        description: t("shopPage.reviews.ratingRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReview(true);
    try {
      await createReviewBySlug(shopSlug, {
        rating,
        ...(comment ? { comment } : {}),
      });

      toast({
        title: t("shopPage.reviews.submittedTitle"),
        description: t("shopPage.reviews.submittedDesc"),
      });

      setReviewDialogOpen(false);
      setReviewRating(5);
      setReviewComment("");

      // Refresh list + summary shown in header
      await Promise.all([reviewsListQuery.refetch(), shopQuery.refetch()]);
    } catch (e: unknown) {
      const status = (e as any)?.status;
      if (status === 401) {
        toast({
          title: t("shopPage.auth.loginRequiredTitle"),
          description: t("shopPage.reviews.loginRequiredDesc"),
          variant: "destructive",
        });
        navigate("/login", { replace: true, state: { from: location, authRequired: true } });
        return;
      }

      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message || "")
          : "";
      toast({
        title: t("shopPage.reviews.submitFailedTitle"),
        description:
          i18n.language === "en"
            ? (msg || t("shopPage.generic.somethingWentWrong"))
            : t("shopPage.generic.somethingWentWrong"),
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <PageTransition>
      <StoriesTray
        stories={shopStoriesQuery.data || []}
        hideTray
        startOpen={logoStoriesOpen}
        initialBusinessId={shopQuery.data?.id || null}
        onClose={() => setLogoStoriesOpen(false)}
      />
      {/* Cover */}
      <motion.div
        className="relative h-48 md:h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <img src={shop.coverImage} alt={shop.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </motion.div>

      <div className="container -mt-12 relative z-10">
        {/* Header Card */}
        <ScrollReveal>
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  className={hasActiveStory ? "cursor-pointer" : "cursor-default"}
                  onClick={() => {
                    if (!hasActiveStory) return;
                    setLogoStoriesOpen(true);
                  }}
                  aria-label={
                    hasActiveStory ? t("shopPage.stories.openStoriesAriaLabel") : t("shopPage.stories.logoAriaLabel")
                  }
                >
                  <img
                    src={shop.logo}
                    alt=""
                    className={
                      "w-16 h-16 rounded-xl object-cover border-2 shadow " +
                      (hasActiveStory ? "border-primary" : "border-card")
                    }
                  />
                </button>
                <div className="flex-1 min-w-0">
                  {/* Name + Verified + Open/Close (mobile-first) */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    

                    <Badge
                      variant={shop.isOpen ? "default" : "secondary"}
                      className={shop.isOpen ? "bg-primary whitespace-nowrap self-start" : "whitespace-nowrap self-start"}
                    >
                      {shop.isOpen ? t("shopPage.status.openNow") : t("shopPage.status.closed")}
                    </Badge>

                    <div className="min-w-0">
                      <div className="flex items-start gap-2">
                        <h1 className="min-w-0 text-xl md:text-2xl font-bold leading-tight break-normal">
                          {shop.name}
                        </h1>
                        {shop.verified && <BadgeCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
                      </div>
                    </div>
                  </div>

                  {/* Category (single line) */}
                  <p className="text-muted-foreground text-sm whitespace-nowrap">
                    {shop.category}
                  </p>

                  <div className="flex items-start gap-2 mt-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-muted-foreground text-sm leading-snug break-words">
                      {shop.address}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-secondary text-secondary" />
                      <span className="font-medium">{shop.rating}</span>
                      <span className="text-xs text-muted-foreground">({t("shopPage.reviews.countLabel", { count: shop.reviewCount })})</span>
                    </div>
                    {distanceEtaLabel && (
                      <div className="flex items-center gap-1 text-sm font-medium text-accent whitespace-nowrap">
                        <Navigation2 className="h-4 w-4" />
                        <span>{distanceEtaLabel}</span>
                      </div>
                    )}
                    {distance === null && permissionDenied && (
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {t("shopPage.location.permissionDeniedHint")}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mt-4">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
                  <Button className="gap-2 w-full" asChild>
                    <a
                      href={`https://wa.me/${shop.whatsapp}?text=${encodeURIComponent(
                        t("shopPage.whatsapp.foundShopPrefill")
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackAction("whatsapp")}
                    >
                      <MessageCircle className="h-4 w-4" /> {t("shopPage.actions.whatsapp")}
                    </a>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
                  <Button variant="outline" className="gap-2 w-full" asChild>
                    <a href={`tel:+${shop.phone}`} onClick={() => trackAction("call")}>
                      <Phone className="h-4 w-4" /> {t("shopPage.actions.call")}
                    </a>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
                  <Button
                    variant="outline"
                    className="gap-2 w-full"
                    onClick={() => {
                      trackAction("map");
                      setFullMapOpen(true);
                    }}
                  >
                    <Navigation className="h-4 w-4" /> {t("shopPage.actions.directions")}
                    {distanceKm !== null && distanceKm !== undefined && (
                      <span className="text-xs">({formatDistance(distanceKm)})</span>
                    )}
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
                  <Dialog open={bookingOpen} onOpenChange={(open) => !bookingSubmitting && setBookingOpen(open)}>
                    <DialogTrigger asChild>
                      <Button
                        className="gap-2 w-full"
                        onClick={(e) => {
                          if (hasAuthSession()) return;
                          e.preventDefault();
                          toast({
                            title: t("shopPage.auth.loginRequiredTitle"),
                            description: t("shopPage.booking.loginRequiredDesc"),
                            variant: "destructive",
                          });
                          navigate("/login", { replace: true, state: { from: location, authRequired: true } });
                        }}
                      >
                        <Calendar className="h-4 w-4" /> {t("shopPage.actions.book")}
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="w-[calc(100%-1.5rem)] sm:w-full sm:max-w-lg max-h-[85vh] overflow-y-auto p-0">
                      <div className="p-6">
                        <DialogHeader>
                          <DialogTitle>{t("shopPage.booking.dialogTitle")}</DialogTitle>
                        </DialogHeader>

                        <div className="mt-1 text-sm text-muted-foreground">{shop.name}</div>

                        <div className="mt-6 space-y-5">
                          <div className="space-y-4">
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                              <div className="text-xs text-emerald-700">{t("shopPage.booking.bookingAsLabel")}</div>
                              <div className="text-sm font-semibold text-slate-900">{user?.name || t("shopPage.customerFallbackLabel")}</div>
                              <div className="text-xs text-slate-600">{user?.phone || user?.email || t("shopPage.booking.profileDetailsFallback")}</div>
                            </div>

                            {bookableItems.length > 0 ? (
                              <div>
                                <div className="text-sm font-medium">{t("shopPage.booking.itemServiceLabel")}</div>
                                <div className="mt-2">
                                  <Select
                                    value={bookingListingId || "__general__"}
                                    onValueChange={(v) => setBookingListingId(v === "__general__" ? "" : v)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("shopPage.booking.selectItemPlaceholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__general__">{t("shopPage.booking.generalAppointmentOption")}</SelectItem>
                                      {bookableItems.map((p) => (
                                        <SelectItem key={String(p.id)} value={String(p.id)}>
                                          {p.name}{typeof p.price === "number" ? ` (₹${p.price})` : ""}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            ) : null}

                            <div>
                              <div className="text-sm font-medium">{t("shopPage.booking.dateLabel")}</div>
                              <Input
                                className="mt-2"
                                type="date"
                                value={bookingDate}
                                onChange={(e) => setBookingDate(e.target.value)}
                              />
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <div className="text-sm font-medium">{t("shopPage.booking.timeSlotLabel")}</div>
                            <div className="mt-3">
                              {!bookingDate ? (
                                <p className="text-sm text-muted-foreground">{t("shopPage.booking.selectDateToSeeSlots")}</p>
                              ) : slotsQuery.isLoading ? (
                                <p className="text-sm text-muted-foreground">{t("shopPage.booking.loadingSlots")}</p>
                              ) : slotsQuery.isError ? (
                                <p className="text-sm text-destructive">
                                  {i18n.language === "en" && (slotsQuery.error as any)?.message
                                    ? String((slotsQuery.error as any).message)
                                    : t("shopPage.booking.failedToLoadSlots")}
                                </p>
                              ) : visibleSlots.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  {isTodaySelected ? t("shopPage.booking.noSlotsToday") : t("shopPage.booking.noSlotsForDate")}
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {visibleSlots.map((s) => {
                                    const isAvailable = !s.isBooked && String(s.status || "") === "available";
                                    const selected = selectedStartTime === s.startTime;
                                    return (
                                      <button
                                        key={s._id}
                                        type="button"
                                        onClick={() => isAvailable && setSelectedStartTime(s.startTime)}
                                        disabled={!isAvailable}
                                        className={`px-3 py-2 rounded-xl border text-sm transition-colors ${
                                          isAvailable
                                            ? selected
                                              ? "border-primary bg-primary/10 text-primary"
                                              : "hover:bg-muted"
                                            : "opacity-50 cursor-not-allowed bg-muted/30"
                                        }`}
                                      >
                                        <span className="font-medium">{formatTime12h(s.startTime)}</span>
                                        <span
                                          className={`ml-2 text-xs ${isAvailable ? "text-muted-foreground" : "text-destructive"}`}
                                        >
                                          {isAvailable ? t("shopPage.booking.available") : t("shopPage.booking.unavailable")}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium">{t("shopPage.booking.notesOptionalLabel")}</div>
                            <Textarea
                              className="mt-2"
                              value={bookingNotes}
                              onChange={(e) => setBookingNotes(e.target.value)}
                              placeholder={t("shopPage.booking.notesPlaceholder")}
                            />
                          </div>

                          <Button
                            type="button"
                            className="w-full py-6 rounded-xl font-semibold"
                            onClick={submitBooking}
                            disabled={bookingSubmitting}
                          >
                            {bookingSubmitting ? t("shopPage.booking.bookingInProgress") : t("shopPage.booking.confirmBooking")}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        {Array.isArray(offersQuery.data) && offersQuery.data.length > 0 ? (
          <ScrollReveal>
            <div className="mb-6">
              <div className="flex gap-3 overflow-x-auto pb-1">
                {offersQuery.data
                  .filter((o: any) => !!(o?.banner?.imageUrl || o?.title || o?.titleHi))
                  .map((o: any) => {
                    const title = i18n.language === "hi" ? String(o?.titleHi || o?.title || "").trim() : String(o?.title || "").trim();
                    const desc = i18n.language === "hi"
                      ? String(o?.descriptionHi || o?.description || "").trim()
                      : String(o?.description || "").trim();
                    const href = (() => {
                      const direct = String(o?.banner?.linkUrl || "").trim();
                      if (direct) return direct;
                      const listingId = String((o as any)?.listingId || "").trim();
                      if (!listingId) return "";
                      return `?listing=${encodeURIComponent(listingId)}`;
                    })();
                    const isExternal = /^https?:\/\//i.test(href);
                    const Wrap: any = href ? "a" : "div";
                    return (
                      <Wrap
                        key={String(o._id)}
                        href={href || undefined}
                        target={href && isExternal ? "_blank" : undefined}
                        rel={href && isExternal ? "noreferrer" : undefined}
                        className="shrink-0 w-full sm:w-[420px] rounded-xl border border-border bg-card overflow-hidden"
                      >
                        {o?.banner?.imageUrl ? (
                          <img
                            src={String(o.banner.imageUrl)}
                            alt={title || shop.name}
                            className="h-44 w-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                        <div className="p-3">
                          {title ? <div className="text-base font-semibold text-foreground line-clamp-2">{title}</div> : null}
                          {desc ? <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{desc}</div> : null}
                        </div>
                      </Wrap>
                    );
                  })}
              </div>
            </div>
          </ScrollReveal>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Products */}
            <ScrollReveal>
              <Card>
                <CardHeader>
                  <CardTitle>{listingsTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  {listingsQuery.isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Skeleton className="h-28 w-full rounded-lg" />
                      <Skeleton className="h-28 w-full rounded-lg" />
                    </div>
                  ) : null}

                  <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {shop.products.map(p => (
                      <StaggerItem key={p.id}>
                        <div
                          className="flex gap-3 p-3 rounded-lg border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => setSelectedProduct(p)}
                        >
                          <img src={p.image} alt={p.name} className="w-20 h-20 rounded-lg object-cover" loading="lazy" />
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-medium text-sm">{p.name}</h4>
                              <div className="flex items-center gap-2">
                                <p className="text-primary font-semibold">₹{p.price}</p>
                                {(() => {
                                  const price = Number(p.price);
                                  const oldPrice = Number((p as any).oldPrice);
                                  if (!Number.isFinite(price) || !Number.isFinite(oldPrice)) return null;
                                  if (oldPrice <= price || oldPrice <= 0) return null;

                                  const rawPercent = Number((p as any).discountPercent);
                                  const percent = Number.isFinite(rawPercent) && rawPercent > 0
                                    ? Math.round(rawPercent)
                                    : Math.round(((oldPrice - price) / oldPrice) * 100);
                                  if (!Number.isFinite(percent) || percent <= 0) return null;

                                  return (
                                    <>
                                      <span className="text-xs text-muted-foreground line-through">₹{oldPrice}</span>
                                      <Badge variant="secondary" className="text-[10px]">-{percent}%</Badge>
                                    </>
                                  );
                                })()}
                              </div>
                              {p.type && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {p.type === "service"
                                    ? t("shopPage.listingType.service")
                                    : p.type === "food"
                                      ? t("shopPage.listingType.food")
                                      : p.type === "course"
                                        ? t("shopPage.listingType.course")
                                        : p.type === "rental"
                                          ? t("shopPage.listingType.rental")
                                          : t("shopPage.listingType.product")}
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              className="w-fit gap-1 mt-1"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProduct(p);
                              }}
                            >
                              <MessageCircle className="h-3 w-3" /> {t("shopPage.actions.order")}
                            </Button>
                          </div>
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerChildren>

                  {!listingsQuery.isLoading && shop.products.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("shopPage.listings.noFeatured")}</p>
                  ) : null}
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* About */}
            <ScrollReveal delay={0.1}>
              <Card>
                <CardHeader><CardTitle>{t("shopPage.about.title")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">
                    {i18n.language === "hi" && !hasDevanagari(shop.description)
                      ? t("shopPage.about.autoIntro", { category: shop.category, city: shop.city })
                      : shop.description}
                  </p>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground">{t("shopPage.about.ownerLabel")}</div>
                    <div className="text-sm font-semibold">{ownerName}</div>
                    {ownerPhone || ownerEmail ? (
                      <div className="text-xs text-muted-foreground mt-1">
                        {ownerPhone ? ownerPhone : ownerEmail}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* Reviews */}
            <ScrollReveal delay={0.12}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <CardTitle>{t("shopPage.reviews.title")}</CardTitle>
                  <Dialog open={reviewDialogOpen} onOpenChange={(open) => !isSubmittingReview && setReviewDialogOpen(open)}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          if (hasAuthSession()) return;
                          e.preventDefault();
                          toast({
                            title: t("shopPage.auth.loginRequiredTitle"),
                            description: t("shopPage.reviews.loginRequiredDesc"),
                            variant: "destructive",
                          });
                          navigate("/login", { replace: true, state: { from: location, authRequired: true } });
                        }}
                      >
                        {t("shopPage.reviews.writeButton")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{t("shopPage.reviews.dialogTitle")}</DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium">{t("shopPage.reviews.yourRatingLabel")}</div>
                          <div className="mt-2 flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, idx) => {
                              const value = idx + 1;
                              const filled = value <= (Number(reviewRating) || 0);
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  className="p-1 rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  onClick={() => setReviewRating(value)}
                                  aria-label={t("shopPage.reviews.starAriaLabel", { value })}
                                >
                                  <Star
                                    size={20}
                                    className={filled ? "fill-secondary text-secondary" : "text-muted-foreground"}
                                  />
                                </button>
                              );
                            })}
                            <span className="ml-2 text-sm text-muted-foreground">{Math.min(5, Math.max(1, Number(reviewRating) || 0))}/5</span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                          <div className="text-xs text-emerald-700">{t("shopPage.reviews.submittingAs")}</div>
                          <div className="text-sm font-semibold text-slate-900">
                            {user?.name || user?.email || t("shopPage.reviews.customerFallback")}
                          
                            {user?.name || user?.email || t("shopPage.reviews.customerFallback")}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium">{t("shopPage.reviews.commentOptionalLabel")}</div>
                          <Textarea
                            className="mt-2"
                            placeholder={t("shopPage.reviews.commentPlaceholder")}
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            maxLength={1000}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setReviewDialogOpen(false)}
                            disabled={isSubmittingReview}
                          >
                            {t("shopPage.actions.cancel")}
                          </Button>
                          <Button type="button" onClick={submitReview} disabled={isSubmittingReview}>
                            {isSubmittingReview ? t("shopPage.actions.submitting") : t("shopPage.reviews.submitButton")}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold leading-none">
                        {Number(shop.rating || 0) > 0 ? Number(shop.rating).toFixed(1) : "0.0"}
                      </div>
                      <div>
                        <StarsRow rating={shop.rating} size={16} />
                        <div className="text-xs text-muted-foreground mt-1">{t("shopPage.reviews.countLabel", { count: shop.reviewCount })}</div>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {reviewsListQuery.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : reviewsListQuery.isError ? (
                    <div className="text-sm text-muted-foreground">{t("shopPage.reviews.loadError")}</div>
                  ) : (reviewsListQuery.data?.length || 0) === 0 ? (
                    <div className="text-sm text-muted-foreground">{t("shopPage.reviews.empty")}</div>
                  ) : (
                    <div className="space-y-4">
                      {reviewsListQuery.data!.map((r) => (
                        <div key={r._id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">
                                {r.customerName?.trim() ? r.customerName : t("shopPage.reviews.customerFallback")}
                              </div>
                              <div className="mt-1">
                                <StarsRow rating={r.rating} size={14} />
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">{formatReviewDate(r.createdAt)}</div>
                          </div>
                          {r.comment?.trim() ? (
                            <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{r.comment}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <ScrollReveal delay={0.15}>
              <Card>
                <CardHeader><CardTitle>{t("shopPage.businessInfo.title")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <UserCircle2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">{ownerName}</p>
                      {ownerPhone ? <p className="text-muted-foreground">{ownerPhone}</p> : null}
                      {!ownerPhone && ownerEmail ? <p className="text-muted-foreground">{ownerEmail}</p> : null}
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <p>{shop.address}</p>
                      {distanceEtaLabel && (
                        <p className="text-accent font-medium mt-1">{distanceEtaLabel}</p>
                      )}
                    </div>
                  </div>
                  {websiteLink && (
                    <>
                      <Separator />
                      <div className="flex items-start gap-3">
                        <Navigation2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">{t("shopPage.businessInfo.websiteLabel")}</p>
                          <a
                            href={websiteLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm underline underline-offset-4 break-all"
                          >
                            {websiteLink}
                          </a>
                          <div className="mt-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => shareShopLink(shop.name)}>
                              <Share2 className="h-4 w-4" /> {t("shopPage.actions.share")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <p>{shop.openingTime} — {shop.closingTime}</p>
                      <p className="text-muted-foreground">{t("shopPage.businessInfo.weeklyOffLabel")}: {shop.weeklyOff}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {shop.paymentMethods.map(m => (
                        <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* In-app Map */}
            <ScrollReveal delay={0.2}>
              <Card>
                <CardHeader><CardTitle>{t("shopPage.location.title")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden border">
                    {mapsKey ? (
                      <div
                        ref={mapRef}
                        className="w-full h-80"
                        onClick={() => trackAction("map")}
                      />
                    ) : (
                      <iframe
                        title={t("shopPage.directions.iframeTitle")}
                        src={directionsEmbedUrl}
                        className="w-full h-80"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        onLoad={() => trackAction("map")}
                      />
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      {distanceEtaLabel || ""}
                    </div>
                    <Dialog open={fullMapOpen} onOpenChange={setFullMapOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => trackAction("map")}>
                          <Navigation className="h-4 w-4" /> {t("shopPage.location.openFullMap")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-3xl sm:w-full sm:max-w-3xl p-0">
                        <DialogHeader>
                          <div className="px-4 pt-4">
                            <DialogTitle>{t("shopPage.directions.title")}</DialogTitle>
                          </div>
                        </DialogHeader>

                        <div className="px-4 pb-4">
                          <div className="rounded-lg overflow-hidden border">
                            <div ref={fullMapRef} className="w-full h-[60vh] sm:h-[70vh]" />
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="text-sm text-muted-foreground">
                              {distanceEtaLabel || ""}
                            </div>
                            <Button variant="outline" size="sm" className="gap-2" asChild>
                              <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                                <Navigation className="h-4 w-4" /> {t("shopPage.directions.openInGoogleMaps")}
                              </a>
                            </Button>
                          </div>

                          {Array.isArray(routeQuery.data?.steps) && routeQuery.data!.steps!.length > 0 ? (
                            <div className="mt-3 max-h-[22vh] sm:max-h-56 overflow-auto text-sm">
                              <div className="font-medium mb-2">{t("shopPage.directions.stepsTitle")}</div>
                              <ol className="space-y-2">
                                {routeQuery.data!.steps!.slice(0, 20).map((s, idx) => (
                                  <li key={idx} className="text-muted-foreground">
                                    <span className="text-foreground">{idx + 1}. </span>
                                    {s.instruction}
                                    {(s.distanceText || s.durationText) ? (
                                      <span className="ml-2 text-xs">
                                        {s.distanceText ? s.distanceText : ''}{s.distanceText && s.durationText ? ' • ' : ''}{s.durationText ? s.durationText : ''}
                                      </span>
                                    ) : null}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          ) : null}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        product={selectedProduct}
        businessId={shopQuery.data?.id || ''}
        shopSlug={shop.slug}
        customerName={user?.name || ''}
        customerPhone={user?.phone || ''}
        shopWhatsapp={shop.whatsapp}
        shopName={shop.name}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && closeSelectedProduct()}
        onBook={(product) => {
          closeSelectedProduct();
          setBookingListingId(String(product.id));
          setBookingOpen(true);
        }}
      />

      <AiChatWidget businessId={shopQuery.data?.id || null} businessName={shopQuery.data?.name} />
    </PageTransition>
  );
}
