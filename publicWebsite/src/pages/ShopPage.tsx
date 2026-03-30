import { useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, MessageCircle, Phone, MapPin, Clock, BadgeCheck, CreditCard, Navigation, Navigation2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import PageTransition from "@/components/PageTransition";
import ScrollReveal from "@/components/ScrollReveal";
import StaggerChildren, { StaggerItem } from "@/components/StaggerChildren";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import TimeSlots from "@/components/TimeSlots";
import { motion } from "framer-motion";
import { type Product } from "@/data/mockData";
import { useEffect } from "react";
import { useUserLocation, getDistanceKm, formatDistance } from "@/hooks/useUserLocation";
import { API_BASE_URL, fetchRoute } from "@/lib/publicShopsApi";
import { fetchBusinessDistance, fetchPublicListingsForShop, fetchPublicShopBySlug } from "@/lib/publicShopsApi";
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

const createReviewBySlug = async (slug: string, payload: { rating: number; customerName?: string; comment?: string }) => {
  const response = await fetch(`${API_BASE_URL}/reviews/business/${encodeURIComponent(slug)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const json = (await response.json()) as CreateReviewResponse;
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

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewCustomerName, setReviewCustomerName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const shopPublicUrl = useMemo(() => {
    if (!shopSlug) return "";
    const base = import.meta.env.VITE_STOREFRONT_URL || "";
    let baseUrl = String(base || (typeof window === "undefined" ? "" : window.location.origin)).trim();

    // Ensure the URL is absolute/clickable in apps like WhatsApp.
    // If user sets VITE_STOREFRONT_URL like "apnidukan.com", auto-prefix https://
    if (baseUrl && !/^(https?:)?\/\//i.test(baseUrl)) {
      baseUrl = `https://${baseUrl}`;
    }

    baseUrl = baseUrl.replace(/\/\/+$/, "");
    return `${baseUrl}/shop/${shopSlug}`;
  }, [shopSlug]);

  const isNonShareableLocalUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.hostname === "localhost" || u.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  };

  const shareShopLink = async (title?: string) => {
    if (!shopPublicUrl) return;

    if (isNonShareableLocalUrl(shopPublicUrl)) {
      toast({
        title: "Link public nahi hai",
        description: "Ye link localhost pe point kar raha hai. Public share ke liye VITE_STOREFRONT_URL ko apni live website/domain par set karein.",
        variant: "destructive",
      });
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: title || "DukaanDirect", url: shopPublicUrl });
        return;
      }

      await navigator.clipboard?.writeText(shopPublicUrl);
      toast({
        title: "Link copied",
        description: shopPublicUrl,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: shopPublicUrl,
        variant: "destructive",
      });
    }
  };

  const shopQuery = useQuery({
    queryKey: ["public-shop-by-slug", shopSlug],
    queryFn: () => fetchPublicShopBySlug(shopSlug || ""),
    enabled: !!shopSlug,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  const reviewsListQuery = useQuery({
    queryKey: ["public-reviews-by-slug", shopSlug],
    queryFn: () => fetchReviewsBySlug(shopSlug || "", 10),
    enabled: !!shopSlug,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });

  const listingsQuery = useQuery({
    queryKey: ["public-shop-listings", shopQuery.data?.id],
    queryFn: () => fetchPublicListingsForShop(shopQuery.data?.id || ""),
    enabled: !!shopQuery.data?.id,
  });

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
        products: listingsQuery.data || [],
      }
    : null;

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
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold">Shop load nahi ho payi</h1>
        <p className="text-muted-foreground mt-2">
          {shopQuery.error instanceof Error ? shopQuery.error.message : "Something went wrong"}
        </p>
        <button onClick={() => shopQuery.refetch()} className="text-primary mt-4 inline-block">Retry</button>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold">Shop not found</h1>
        <Link to="/" className="text-primary mt-4 inline-block">← Back to Home</Link>
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
    if (!etaLabel) return `${formatDistance(distanceKm)} aapse door`;
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
    } catch {
      // best-effort
    }
  };

  const listingsTitle = (() => {
    const t = shop.suggestedListingType;
    if (t === "food") return "Food Items";
    if (t === "course") return "Courses";
    if (t === "rental") return "Rentals";
    if (t === "service") return "Services";
    if (t === "product") return "Products";
    return "Products & Services";
  })();

  const submitReview = async () => {
    if (!shopSlug) return;
    const rating = Math.min(5, Math.max(1, Math.round(Number(reviewRating) || 0)));
    const customerName = String(reviewCustomerName || "").trim();
    const comment = String(reviewComment || "").trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      toast({
        title: "Rating required",
        description: "Please select a rating (1-5).",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReview(true);
    try {
      await createReviewBySlug(shopSlug, {
        rating,
        ...(customerName ? { customerName } : {}),
        ...(comment ? { comment } : {}),
      });

      toast({
        title: "Review submitted",
        description: "Thanks! Aapka review save ho gaya.",
      });

      setReviewDialogOpen(false);
      setReviewRating(5);
      setReviewCustomerName("");
      setReviewComment("");

      // Refresh list + summary shown in header
      await Promise.all([reviewsListQuery.refetch(), shopQuery.refetch()]);
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message || "")
          : "";
      toast({
        title: "Review submit failed",
        description: msg || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <PageTransition>
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
                <img src={shop.logo} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-card shadow" />
                <div className="flex-1 min-w-0">
                  {/* Name + Verified + Open/Close (mobile-first) */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    

                    <Badge
                      variant={shop.isOpen ? "default" : "secondary"}
                      className={shop.isOpen ? "bg-primary whitespace-nowrap self-start" : "whitespace-nowrap self-start"}
                    >
                      {shop.isOpen ? "Open Now" : "Closed"}
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
                      <span className="text-xs text-muted-foreground">({shop.reviewCount} reviews)</span>
                    </div>
                    {distanceEtaLabel && (
                      <div className="flex items-center gap-1 text-sm font-medium text-accent whitespace-nowrap">
                        <Navigation2 className="h-4 w-4" />
                        <span>{distanceEtaLabel}</span>
                      </div>
                    )}
                    {distance === null && permissionDenied && (
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        Location allow karein to distance/route dikhega
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
                      href={`https://wa.me/${shop.whatsapp}?text=Hi, I found your shop on DukaanDirect!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackAction("whatsapp")}
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
                  <Button variant="outline" className="gap-2 w-full" asChild>
                    <a href={`tel:+${shop.phone}`} onClick={() => trackAction("call")}>
                      <Phone className="h-4 w-4" /> Call
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
                    <Navigation className="h-4 w-4" /> Directions
                    {distanceKm !== null && distanceKm !== undefined && (
                      <span className="text-xs">({formatDistance(distanceKm)})</span>
                    )}
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

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
                              <p className="text-primary font-semibold">₹{p.price}</p>
                              {p.type && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {p.type === "service"
                                    ? "Service"
                                    : p.type === "food"
                                      ? "Food"
                                      : p.type === "course"
                                        ? "Course"
                                        : p.type === "rental"
                                          ? "Rental"
                                          : "Product"}
                                </Badge>
                              )}
                            </div>
                            <Button size="sm" className="w-fit gap-1 mt-1" asChild onClick={(e) => e.stopPropagation()}>
                              <a
                                href={`https://wa.me/${shop.whatsapp}?text=Hi, I want to order ${p.name} (₹${p.price}) from DukaanDirect`}
                                target="_blank" rel="noopener noreferrer"
                              >
                                <MessageCircle className="h-3 w-3" /> Order
                              </a>
                            </Button>
                          </div>
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerChildren>

                  {!listingsQuery.isLoading && shop.products.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Is dukaan ne abhi listings add nahi ki hain.</p>
                  ) : null}
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* Time Slots */}
            {shop.timeSlots && shop.timeSlots.length > 0 && (
              <ScrollReveal delay={0.05}>
                <TimeSlots slots={shop.timeSlots} />
              </ScrollReveal>
            )}

            {/* About */}
            <ScrollReveal delay={0.1}>
              <Card>
                <CardHeader><CardTitle>About</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{shop.description}</p>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* Reviews */}
            <ScrollReveal delay={0.12}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <CardTitle>Reviews</CardTitle>
                  <Dialog open={reviewDialogOpen} onOpenChange={(open) => !isSubmittingReview && setReviewDialogOpen(open)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">Write a review</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Write a review</DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium">Your rating</div>
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
                                  aria-label={`${value} star`}
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

                        <div>
                          <div className="text-sm font-medium">Name (optional)</div>
                          <Input
                            className="mt-2"
                            placeholder="Your name"
                            value={reviewCustomerName}
                            onChange={(e) => setReviewCustomerName(e.target.value)}
                            maxLength={100}
                          />
                        </div>

                        <div>
                          <div className="text-sm font-medium">Comment (optional)</div>
                          <Textarea
                            className="mt-2"
                            placeholder="Share your experience"
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
                            Cancel
                          </Button>
                          <Button type="button" onClick={submitReview} disabled={isSubmittingReview}>
                            {isSubmittingReview ? "Submitting..." : "Submit review"}
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
                        <div className="text-xs text-muted-foreground mt-1">{shop.reviewCount} reviews</div>
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
                    <div className="text-sm text-muted-foreground">Reviews load nahi ho paye. Thoda baad me try karein.</div>
                  ) : (reviewsListQuery.data?.length || 0) === 0 ? (
                    <div className="text-sm text-muted-foreground">Abhi koi reviews nahi hain. Pehla review aap likh sakte hain.</div>
                  ) : (
                    <div className="space-y-4">
                      {reviewsListQuery.data!.map((r) => (
                        <div key={r._id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{r.customerName?.trim() ? r.customerName : "Customer"}</div>
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
                <CardHeader><CardTitle>Business Info</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <p>{shop.address}</p>
                      {distanceEtaLabel && (
                        <p className="text-accent font-medium mt-1">{distanceEtaLabel}</p>
                      )}
                    </div>
                  </div>
                  {shopPublicUrl && (
                    <>
                      <Separator />
                      <div className="flex items-start gap-3">
                        <Navigation2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Website link</p>
                          <a
                            href={shopPublicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm underline underline-offset-4 break-all"
                          >
                            {shopPublicUrl}
                          </a>
                          <div className="mt-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => shareShopLink(shop.name)}>
                              <Share2 className="h-4 w-4" /> Share
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
                      <p className="text-muted-foreground">Weekly Off: {shop.weeklyOff}</p>
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
                <CardHeader><CardTitle>Location</CardTitle></CardHeader>
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
                        title="Directions"
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
                          <Navigation className="h-4 w-4" /> Open full map
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-3xl sm:w-full sm:max-w-3xl p-0">
                        <DialogHeader>
                          <div className="px-4 pt-4">
                            <DialogTitle>Directions</DialogTitle>
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
                                <Navigation className="h-4 w-4" /> Open in Google Maps
                              </a>
                            </Button>
                          </div>

                          {Array.isArray(routeQuery.data?.steps) && routeQuery.data!.steps!.length > 0 ? (
                            <div className="mt-3 max-h-[22vh] sm:max-h-56 overflow-auto text-sm">
                              <div className="font-medium mb-2">Steps</div>
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
        shopWhatsapp={shop.whatsapp}
        shopName={shop.name}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      />
    </PageTransition>
  );
}
