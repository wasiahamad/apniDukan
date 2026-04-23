import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  TextInput,
  ActivityIndicator,
  Modal,
  Share,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import Colors from "@/constants/colors";
import { ListingCard } from "@/components/ListingCard";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/utils/apiClient";

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const DAY_LABELS: Record<(typeof DAY_KEYS)[number], string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function formatKm(value: number) {
  if (!Number.isFinite(value)) return null;
  if (value < 1) return `${Math.round(value * 1000)} m`;
  return `${value.toFixed(value < 10 ? 1 : 0)} km`;
}

function formatTime12h(time: string) {
  const [h, m] = String(time || "").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDurationSeconds(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds)) return null;
  const secs = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  if (mins <= 0) return `${rem}s`;
  return `${mins}m ${rem}s`;
}

function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  if (!encoded) return points;

  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b = 0;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < len);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < len);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

function getGoogleMapsApiKey() {
  const expoConfig = Constants.expoConfig as any;
  return (
    expoConfig?.android?.config?.googleMaps?.apiKey ||
    expoConfig?.ios?.config?.googleMapsApiKey ||
    expoConfig?.extra?.googleMapsApiKey ||
    null
  );
}

function buildStaticMapUrl(params: {
  latitude: number;
  longitude: number;
  userCoords?: { lat: number; lng: number } | null;
  polyline?: string | null;
}) {
  const apiKey = getGoogleMapsApiKey();
  const parts = [
    "size=900x520",
    "scale=2",
    "zoom=15",
    "maptype=roadmap",
    `center=${params.latitude},${params.longitude}`,
    `markers=color:red%7C${params.latitude},${params.longitude}`,
  ];

  if (params.userCoords) {
    parts.push(`markers=color:blue%7C${params.userCoords.lat},${params.userCoords.lng}`);
  }

  if (params.polyline) {
    parts.push(`path=enc:${encodeURIComponent(params.polyline)}`);
  }

  if (apiKey) {
    parts.push(`key=${encodeURIComponent(apiKey)}`);
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${parts.join("&")}`;
}

// ── Star row helper ────────────────────────────────────────────────────────────
function Stars({ rating, size = 14, interactive = false, onRate }: {
  rating: number; size?: number; interactive?: boolean; onRate?: (r: number) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Pressable key={s} onPress={() => interactive && onRate?.(s)} disabled={!interactive}>
          <Feather
            name="star"
            size={size}
            color={s <= Math.round(rating) ? "#F59E0B" : "#D1D5DB"}
          />
        </Pressable>
      ))}
    </View>
  );
}

// ── Review card ───────────────────────────────────────────────────────────────
function ReviewCard({ review }: { review: any }) {
  const initials = review.customerName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#0F766E", "#D74E09", "#7C3AED", "#059669", "#D97706", "#0284C7"];
  const color = colors[review.customerName.charCodeAt(0) % colors.length];
  const date = new Date(review.createdAt);
  const dateStr = `${date.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][date.getMonth()]} ${date.getFullYear()}`;

  return (
    <View style={reviewStyles.card}>
      <View style={reviewStyles.header}>
        <View style={[reviewStyles.avatar, { backgroundColor: color + "20" }]}>
          <Text style={[reviewStyles.avatarText, { color }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={reviewStyles.name}>{review.customerName}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
            <Stars rating={review.rating} size={13} />
            <Text style={reviewStyles.date}>{dateStr}</Text>
          </View>
        </View>
        <View style={reviewStyles.ratingBubble}>
          <Text style={reviewStyles.ratingNum}>{review.rating}.0</Text>
        </View>
      </View>
      {review.comment ? (
        <Text style={reviewStyles.comment}>{review.comment}</Text>
      ) : null}
    </View>
  );
}

// ── Rating summary bar ────────────────────────────────────────────────────────
function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ fontFamily: "Manrope_500Medium", fontSize: 12, color: "#6B7280", width: 10 }}>{label}</Text>
      <Feather name="star" size={11} color="#F59E0B" />
      <View style={{ flex: 1, height: 6, backgroundColor: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: "#F59E0B", borderRadius: 3 }} />
      </View>
      <Text style={{ fontFamily: "Manrope_400Regular", fontSize: 12, color: "#9CA3AF", width: 20, textAlign: "right" }}>{count}</Text>
    </View>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────
function ActionButton({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.actionBtn, { borderColor: color }]}>
      <Feather name={icon as any} size={18} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fullMapOpen, setFullMapOpen] = useState(false);

  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryName, setInquiryName] = useState(user?.name ?? "");
  const [inquiryPhone, setInquiryPhone] = useState(user?.phone ?? "");
  const [inquiryMsg, setInquiryMsg] = useState("");

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // ── Data ────────────────────────────────────────────────────────────────────
  type UiBusiness = {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    isVerified: boolean;
    coverImage?: string | null;
    businessType: string;
    category: string;
    address?: string | null;
    city?: string | null;
    pincode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isOpen?: boolean | null;
    openStatusMode?: "auto" | "open" | "closed" | null;
    workingHours?: Record<string, { open?: string; close?: string; isOpen?: boolean }> | null;
  };

  const { data: business, isLoading, isError } = useQuery({
    queryKey: ["business", id],
    queryFn: async () => {
      const raw = await apiRequest<any>(`/business/${id}`);

      const typeSlug = raw?.businessType?.slug || raw?.businessType?.name || "other";
      const typeName = raw?.businessType?.name || typeSlug;
      const street = raw?.address?.street ? String(raw.address.street) : "";
      const city = raw?.address?.city ? String(raw.address.city) : "";
      const state = raw?.address?.state ? String(raw.address.state) : "";
      const addressLine = [street, state].filter(Boolean).join(", ");

      const mapped: UiBusiness = {
        id: String(raw?._id || raw?.id || id),
        slug: String(raw?.slug || ""),
        name: String(raw?.name || ""),
        description: raw?.description ? String(raw.description) : null,
        phone: raw?.phone ? String(raw.phone) : null,
        whatsapp: raw?.whatsapp ? String(raw.whatsapp) : null,
        isVerified: !!raw?.isVerified,
        coverImage: raw?.coverImage ? String(raw.coverImage) : null,
        businessType: String(typeSlug).toLowerCase(),
        category: String(typeName),
        address: addressLine || null,
        city: city || null,
        pincode: raw?.address?.pincode ? String(raw.address.pincode) : null,
        latitude: (() => {
          const coords = raw?.address?.location?.coordinates;
          if (Array.isArray(coords) && coords.length >= 2) {
            const lng = Number(coords[0]);
            const lat = Number(coords[1]);
            return Number.isFinite(lat) ? lat : null;
          }
          const legacy = raw?.address?.coordinates;
          const lat = Number(
            legacy?.latitude ??
              legacy?.lat ??
              raw?.address?.latitude ??
              raw?.latitude
          );
          return Number.isFinite(lat) ? lat : null;
        })(),
        longitude: (() => {
          const coords = raw?.address?.location?.coordinates;
          if (Array.isArray(coords) && coords.length >= 2) {
            const lng = Number(coords[0]);
            return Number.isFinite(lng) ? lng : null;
          }
          const legacy = raw?.address?.coordinates;
          const lng = Number(
            legacy?.longitude ??
              legacy?.lng ??
              raw?.address?.longitude ??
              raw?.longitude
          );
          return Number.isFinite(lng) ? lng : null;
        })(),
        isOpen: typeof raw?.isOpen === "boolean" ? raw.isOpen : null,
        openStatusMode: raw?.openStatusMode ? String(raw.openStatusMode) as any : null,
        workingHours: raw?.workingHours && typeof raw.workingHours === "object" ? raw.workingHours : null,
      };

      return mapped;
    },
    enabled: !!id,
  });

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (perm.status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        setUserCoords({ lat: Number(lat), lng: Number(lng) });
      } catch {
        // Ignore; distance/route is optional.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const { data: listings = [] } = useQuery({
    queryKey: ["public-listings", id],
    queryFn: async () => {
      const out = await apiRequest<{ listings: any[] }>(`/listings/public/business/${id}?limit=20`);
      const rows = Array.isArray(out?.listings) ? out.listings : [];
      return rows.map((l: any) => {
        const images = Array.isArray(l?.images) ? l.images.map((i: any) => i?.url).filter(Boolean) : [];
        const priceType = String(l?.priceType || "fixed");
        const priceUnit = priceType === "per_day" ? "day"
          : priceType === "per_month" ? "month"
            : priceType === "per_hour" ? "hour"
              : null;

        return {
          id: String(l?._id || l?.id || ""),
          title: String(l?.title || ""),
          description: l?.description ? String(l.description) : null,
          listingType: String(l?.listingType || "product"),
          price: typeof l?.price === "number" ? l.price : null,
          priceUnit,
          images,
          isAvailable: l?.isActive !== false,
          duration: null,
          tags: [],
        };
      });
    },
    enabled: !!id,
  });

  const { data: reviewSummary } = useQuery({
    queryKey: ["review-summary", business?.slug],
    queryFn: async () => apiRequest<{ avgRating: number; reviewsCount: number }>(`/reviews/business/${business?.slug}/summary`),
    enabled: !!business?.slug,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["reviews", business?.slug],
    queryFn: async () => {
      const rows = await apiRequest<any[]>(`/reviews/business/${business?.slug}?limit=50`);
      return Array.isArray(rows)
        ? rows.map((r: any) => ({
            id: String(r?._id || r?.id || ""),
            customerName: String(r?.customerName || "Anonymous"),
            rating: Number(r?.rating || 0),
            comment: r?.comment ? String(r.comment) : "",
            createdAt: r?.createdAt,
          }))
        : [];
    },
    enabled: !!business?.slug,
  });

  const trackAction = async (action: "whatsapp" | "call" | "map") => {
    try {
      if (!business?.slug) return;
      await apiRequest(`/business/slug/${encodeURIComponent(business.slug)}/track`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
    } catch {
      // best-effort
    }
  };

  const submitInquiry = useMutation({
    mutationFn: async () => {
      if (!business?.id) throw new Error("Business not loaded");
      return apiRequest("/inquiries", {
        method: "POST",
        body: JSON.stringify({
          businessId: business.id,
          name: inquiryName.trim(),
          phone: inquiryPhone.trim(),
          message: inquiryMsg.trim(),
        }),
      });
    },
    onSuccess: () => {
      setShowInquiry(false);
      setInquiryMsg("");
    },
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!business?.slug) throw new Error("Business not loaded");
      return apiRequest(`/reviews/business/${business.slug}`, {
        method: "POST",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim(),
          customerName: user?.name ?? "Anonymous",
        }),
      });
    },
    onSuccess: () => {
      if (business?.slug) {
        queryClient.invalidateQueries({ queryKey: ["reviews", business.slug] });
        queryClient.invalidateQueries({ queryKey: ["review-summary", business.slug] });
      }
      setReviewSuccess(true);
      setReviewComment("");
      setReviewRating(5);
      setTimeout(() => { setShowReviewModal(false); setReviewSuccess(false); }, 1800);
    },
  });

  // ── Computed stats ───────────────────────────────────────────────────────────
  const totalReviews = reviews.length;
  const starCounts = [5, 4, 3, 2, 1].map(s => ({
    label: String(s),
    count: reviews.filter((r: any) => r.rating === s).length,
  }));

  const businessId = business?.id ?? null;
  const hasCoords = Number.isFinite(business?.latitude) && Number.isFinite(business?.longitude);
  const mapUrl = hasCoords
    ? `https://www.google.com/maps?q=${business?.latitude},${business?.longitude}`
    : null;
  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${business?.latitude},${business?.longitude}`)}&travelmode=driving${userCoords ? `&origin=${encodeURIComponent(`${userCoords.lat},${userCoords.lng}`)}` : ""}`
    : null;
  const distanceKm = hasCoords && userCoords
    ? haversineKm({ lat: userCoords.lat, lng: userCoords.lng }, { lat: business?.latitude as number, lng: business?.longitude as number })
    : null;
  const distanceLabel = distanceKm != null ? formatKm(distanceKm) : null;

  const distanceEtaQuery = useQuery({
    queryKey: ["business-distance", businessId, userCoords?.lat ?? null, userCoords?.lng ?? null],
    queryFn: async () => {
      if (!userCoords || !businessId) return null;
      const q = new URLSearchParams({
        lat: String(userCoords.lat),
        lng: String(userCoords.lng),
      });
      return apiRequest<{ distanceKm: number; durationMins: number; durationSeconds?: number }>(
        `/business/${encodeURIComponent(businessId)}/distance?${q.toString()}`
      );
    },
    enabled: !!userCoords && !!businessId,
    staleTime: 30_000,
  });

  const routeQuery = useQuery({
    queryKey: ["route", businessId, userCoords?.lat ?? null, userCoords?.lng ?? null],
    queryFn: async () => {
      if (!userCoords || !businessId || !hasCoords) return null;
      const q = new URLSearchParams({
        origin: `${userCoords.lat},${userCoords.lng}`,
        destination: `${business?.latitude},${business?.longitude}`,
      });
      return apiRequest<{ polyline: string; durationSeconds?: number; durationText?: string; distanceText?: string }>(
        `/maps/route?${q.toString()}`
      );
    },
    enabled: !!userCoords && !!businessId && hasCoords,
    staleTime: 30_000,
    retry: 1,
  });

  const routePolyline = routeQuery.data?.polyline || null;
  const mapPreviewUrl = hasCoords
    ? buildStaticMapUrl({
        latitude: business?.latitude as number,
        longitude: business?.longitude as number,
        userCoords,
        polyline: routePolyline,
      })
    : null;
  const etaSeconds = (() => {
    const sec = Number(routeQuery.data?.durationSeconds);
    if (Number.isFinite(sec) && sec > 0) return sec;
    const sec2 = Number(distanceEtaQuery.data?.durationSeconds);
    if (Number.isFinite(sec2) && sec2 > 0) return sec2;
    const mins = Number(distanceEtaQuery.data?.durationMins);
    if (Number.isFinite(mins) && mins >= 0) return Math.round(mins * 60);
    return null;
  })();
  const etaLabel = etaSeconds != null ? formatDurationSeconds(etaSeconds) : null;
  const distanceEtaLabel = (() => {
    const km = Number(distanceEtaQuery.data?.distanceKm);
    const safeKm = Number.isFinite(km) && km >= 0 ? km : (distanceKm ?? null);
    const d = safeKm != null ? formatKm(safeKm) : null;
    if (!d && !etaLabel) return null;
    if (d && etaLabel) return `${d} • ${etaLabel}`;
    return d || etaLabel;
  })();

  // ── Loading/error states ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isError || !business) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
        <Feather name="alert-circle" size={48} color={Colors.light.textTertiary} />
        <Text style={{ fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text }}>Business not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backPressable}>
          <Text style={{ fontFamily: "Manrope_600SemiBold", color: "#fff" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const openLabel = (() => {
    if (business.openStatusMode === "open") return "Open";
    if (business.openStatusMode === "closed") return "Closed";
    if (typeof business.isOpen === "boolean") return business.isOpen ? "Open" : "Closed";
    return null;
  })();

  const todayKey = DAY_KEYS[new Date().getDay()];
  const todayHours = business.workingHours?.[todayKey];
  const todayHoursLabel = todayHours
    ? (todayHours.isOpen === false ? "Closed" : (todayHours.open && todayHours.close ? `${formatTime12h(todayHours.open)} - ${formatTime12h(todayHours.close)}` : ""))
    : "";

  const shareBusiness = async () => {
    try {
      const lines: string[] = [];
      lines.push(business.name);
      if (openLabel) lines.push(`Status: ${openLabel}${todayHoursLabel ? ` (${todayHoursLabel})` : ""}`);
      if (business.phone) lines.push(`Phone: ${business.phone}`);
      if (business.address || business.city || business.pincode) {
        const addr = [business.address, business.city, business.pincode].filter(Boolean).join(", ");
        if (addr) lines.push(`Address: ${addr}`);
      }
      if (mapUrl) lines.push(mapUrl);

      await Share.share({ message: lines.join("\n") });
    } catch {
      // ignore
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cover image ─────────────────────────────────────────────────── */}
        <View style={{ height: 260 }}>
          {business.coverImage ? (
            <Image source={{ uri: business.coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "transparent", "transparent", "rgba(0,0,0,0.5)"]}
            style={StyleSheet.absoluteFill}
          />
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: topPad + 8 }]}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </Pressable>
          {business.isVerified && (
            <View style={[styles.verifiedOverlay, { top: topPad + 8, right: 16 }]}>
              <Feather name="check-circle" size={14} color="#fff" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* ── Info card ───────────────────────────────────────────────────── */}
        <View style={styles.infoSection}>
          <View style={styles.nameBadgeRow}>
            <Text style={styles.businessName}>{business.name}</Text>
            {typeof reviewSummary?.avgRating === "number" && reviewSummary.avgRating > 0 && (
              <View style={styles.ratingBadge}>
                <Feather name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>{Number(reviewSummary.avgRating).toFixed(1)}</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Text style={styles.metaChipText}>{business.businessType.charAt(0).toUpperCase() + business.businessType.slice(1)}</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaChipText}>{business.category}</Text></View>
            {totalReviews > 0 && (
              <View style={[styles.metaChip, { backgroundColor: "#FEF3C7" }]}>
                <Text style={[styles.metaChipText, { color: "#92400E" }]}>{totalReviews} reviews</Text>
              </View>
            )}
            {openLabel && (
              <View
                style={[
                  styles.metaChip,
                  { backgroundColor: openLabel === "Open" ? "#D1FAE5" : "#FEE2E2" },
                ]}
              >
                <Text style={[styles.metaChipText, { color: openLabel === "Open" ? "#065F46" : "#991B1B" }]}>{openLabel}</Text>
              </View>
            )}
            {distanceLabel && (
              <View style={[styles.metaChip, { backgroundColor: "#E0F2FE" }]}>
                <Text style={[styles.metaChipText, { color: "#075985" }]}>{distanceLabel} away</Text>
              </View>
            )}
          </View>

          {business.address && (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={15} color={Colors.accent} />
              <Text style={styles.infoText}>{business.address}{business.city ? `, ${business.city}` : ""}</Text>
            </View>
          )}

          {business.description && (
            <Text style={styles.description}>{business.description}</Text>
          )}

          {/* ── Action buttons ─────────────────────────────────────────────── */}
          <View style={styles.actionsRow}>
            {business.phone && <ActionButton icon="phone" label="Call" onPress={() => { trackAction("call"); Linking.openURL(`tel:${business.phone}`); }} color={Colors.accent} />}
            {business.whatsapp && (
              <ActionButton
                icon="message-circle"
                label="WhatsApp"
                onPress={() => {
                  const wa = business.whatsapp;
                  if (!wa) return;
                  const n = wa.replace(/\D/g, "");
                  trackAction("whatsapp");
                  Linking.openURL(`https://wa.me/${n}`);
                }}
                color="#25D366"
              />
            )}
            {mapUrl && (
              <ActionButton
                icon="map-pin"
                label="Map"
                onPress={() => {
                  trackAction("map");
                  Linking.openURL(mapUrl);
                }}
                color={Colors.accent}
              />
            )}
            {directionsUrl && (
              <ActionButton
                icon="navigation"
                label="Directions"
                onPress={() => {
                  trackAction("map");
                  Linking.openURL(directionsUrl);
                }}
                color={Colors.primaryDark}
              />
            )}
            <ActionButton icon="share-2" label="Share" onPress={shareBusiness} color={Colors.light.textSecondary} />
            <ActionButton icon="send" label="Inquiry" onPress={() => setShowInquiry(v => !v)} color={Colors.primary} />
            <ActionButton icon="calendar" label="Book" onPress={() => router.push({ pathname: "/(customer)/booking", params: { businessId: business.id, businessSlug: business.slug, businessName: business.name } })} color={Colors.primaryDark} />
          </View>

          {/* ── Inquiry form ───────────────────────────────────────────────── */}
          {showInquiry && (
            <View style={styles.inquiryForm}>
              <Text style={styles.inquiryTitle}>Send Inquiry</Text>
              <TextInput style={styles.inquiryInput} placeholder="Your Name" placeholderTextColor={Colors.light.textTertiary} value={inquiryName} onChangeText={setInquiryName} />
              <TextInput style={styles.inquiryInput} placeholder="Phone Number" placeholderTextColor={Colors.light.textTertiary} value={inquiryPhone} onChangeText={setInquiryPhone} keyboardType="phone-pad" />
              <TextInput style={[styles.inquiryInput, { height: 90, textAlignVertical: "top" }]} placeholder="Your message..." placeholderTextColor={Colors.light.textTertiary} value={inquiryMsg} onChangeText={setInquiryMsg} multiline />
              <Pressable onPress={() => { if (inquiryName.trim() && inquiryPhone.trim() && inquiryMsg.trim()) submitInquiry.mutate(); }} disabled={submitInquiry.isPending} style={[styles.inquirySubmit, submitInquiry.isPending && { opacity: 0.6 }]}>
                {submitInquiry.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.inquirySubmitText}>Send Message</Text>}
              </Pressable>
              {submitInquiry.isSuccess && <Text style={{ fontFamily: "Manrope_600SemiBold", color: "#059669", textAlign: "center" }}>✓ Inquiry sent successfully!</Text>}
            </View>
          )}

          {/* ── Listings ───────────────────────────────────────────────────── */}
          {listings.length > 0 && (
            <View style={styles.listingsSection}>
              <Text style={styles.sectionTitle}>
                {business.businessType === "restaurant" ? "🍽️ Menu" :
                  business.businessType === "coaching" ? "📚 Courses" :
                    business.businessType === "rental" ? "🏠 Properties" : "📦 Listings"}
              </Text>
              {listings.map((listing: any) => (
                <ListingCard key={listing.id} listing={listing} onPress={() => {}} />
              ))}
            </View>
          )}

          {/* ── Working hours ─────────────────────────────────────────────── */}
          {business.workingHours ? (
            <View style={styles.hoursCard}>
              <View style={styles.hoursHeader}>
                <Text style={styles.hoursTitle}>Working Hours</Text>
                {todayHoursLabel ? (
                  <Text style={styles.hoursTodayText}>Today: {todayHoursLabel}</Text>
                ) : null}
              </View>
              <View style={{ gap: 8 }}>
                {DAY_KEYS.map((key) => {
                  const slot = business.workingHours?.[key];
                  const label = !slot
                    ? "—"
                    : slot.isOpen === false
                      ? "Closed"
                      : (slot.open && slot.close)
                        ? `${formatTime12h(slot.open)} - ${formatTime12h(slot.close)}`
                        : "—";
                  const isToday = key === todayKey;
                  return (
                    <View key={key} style={styles.hoursRow}>
                      <Text style={[styles.hoursDay, isToday && styles.hoursDayToday]}>{DAY_LABELS[key]}</Text>
                      <Text style={[styles.hoursValue, label === "Closed" && { color: "#991B1B" }, isToday && styles.hoursValueToday]}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* ── Location (in-app map + route) ─────────────────────────────── */}
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationTitle}>Location</Text>
              {distanceEtaLabel ? (
                <Text style={styles.locationSub}>{distanceEtaLabel}</Text>
              ) : null}
            </View>

            {hasCoords ? (
              <>
                <View style={styles.mapWrap}>
                  {mapPreviewUrl ? (
                    <Image source={{ uri: mapPreviewUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
                      <Feather name="map-pin" size={28} color={Colors.light.textTertiary} />
                    </View>
                  )}
                  <View style={styles.mapOverlay}>
                    <View style={styles.mapOverlayChip}>
                      <Feather name="map-pin" size={12} color="#fff" />
                      <Text style={styles.mapOverlayText}>{business.name}</Text>
                    </View>
                    {distanceEtaLabel ? (
                      <View style={styles.mapOverlayChipSecondary}>
                        <Feather name="navigation" size={12} color={Colors.primary} />
                        <Text style={styles.mapOverlayTextSecondary}>{distanceEtaLabel}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <Pressable onPress={() => setFullMapOpen(true)} style={styles.fullMapBtn}>
                  <Feather name="navigation" size={16} color={Colors.primary} />
                  <Text style={styles.fullMapBtnText}>Open map</Text>
                </Pressable>

                <Modal visible={fullMapOpen} animationType="slide" onRequestClose={() => setFullMapOpen(false)}>
                  <View style={{ flex: 1, backgroundColor: "#fff" }}>
                    <View style={[styles.fullMapHeader, { paddingTop: topPad + 8 }]}>
                      <Pressable onPress={() => setFullMapOpen(false)} style={styles.fullMapClose}>
                        <Feather name="x" size={22} color={Colors.light.text} />
                      </Pressable>
                      <Text style={styles.fullMapTitle} numberOfLines={1}>{business.name}</Text>
                      <View style={{ width: 40 }} />
                    </View>

                    <View style={{ flex: 1 }}>
                      {mapPreviewUrl ? (
                        <Image source={{ uri: mapPreviewUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
                          <Feather name="map-pin" size={28} color={Colors.light.textTertiary} />
                        </View>
                      )}

                      {distanceEtaLabel ? (
                        <View style={styles.fullMapPill}>
                          <Feather name="clock" size={14} color={Colors.light.textSecondary} />
                          <Text style={styles.fullMapPillText}>{distanceEtaLabel}</Text>
                        </View>
                      ) : null}

                      <View style={styles.fullMapActions}>
                        {mapUrl ? (
                          <Pressable onPress={() => Linking.openURL(mapUrl)} style={styles.fullMapActionBtn}>
                            <Feather name="map" size={14} color={Colors.primary} />
                            <Text style={styles.fullMapActionText}>Open in Maps</Text>
                          </Pressable>
                        ) : null}
                        {directionsUrl ? (
                          <Pressable onPress={() => Linking.openURL(directionsUrl)} style={styles.fullMapActionBtnSecondary}>
                            <Feather name="navigation" size={14} color="#fff" />
                            <Text style={styles.fullMapActionTextSecondary}>Directions</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </Modal>
              </>
            ) : (
              <View style={[styles.mapWrap, { alignItems: "center", justifyContent: "center", padding: 16 }] }>
                <Feather name="map" size={28} color={Colors.light.textTertiary} />
                <Text style={{ fontFamily: "Manrope_600SemiBold", color: Colors.light.textSecondary, marginTop: 8, textAlign: "center" }}>
                  Location not available for this business
                </Text>
              </View>
            )}
          </View>

          {/* ── Reviews section ────────────────────────────────────────────── */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>⭐ Reviews</Text>
              {user?.role === "customer" && (
                <Pressable onPress={() => setShowReviewModal(true)} style={styles.writeReviewBtn}>
                  <Feather name="edit-3" size={14} color={Colors.primary} />
                  <Text style={styles.writeReviewText}>Write Review</Text>
                </Pressable>
              )}
            </View>

            {/* Rating summary */}
            {totalReviews > 0 && (
              <View style={styles.ratingSummary}>
                <View style={styles.ratingSummaryLeft}>
                  <Text style={styles.bigRating}>{Number(reviewSummary?.avgRating || 0).toFixed(1)}</Text>
                  <Stars rating={Number(reviewSummary?.avgRating || 0)} size={18} />
                  <Text style={styles.reviewCountText}>{totalReviews} reviews</Text>
                </View>
                <View style={styles.ratingSummaryRight}>
                  {starCounts.map(({ label, count }) => (
                    <RatingBar key={label} label={label} count={count} total={totalReviews} />
                  ))}
                </View>
              </View>
            )}

            {reviewsLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 12 }} />
            ) : reviews.length === 0 ? (
              <View style={styles.noReviews}>
                <Feather name="message-square" size={32} color={Colors.light.textTertiary} />
                <Text style={styles.noReviewsText}>No reviews yet</Text>
                <Text style={styles.noReviewsSubText}>Be the first to review this business!</Text>
                {user?.role === "customer" && (
                  <Pressable onPress={() => setShowReviewModal(true)} style={styles.firstReviewBtn}>
                    <Text style={styles.firstReviewBtnText}>Write First Review</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {reviews.map((r: any) => <ReviewCard key={r.id} review={r} />)}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Review Modal ───────────────────────────────────────────────────── */}
      <Modal visible={showReviewModal} transparent animationType="slide" onRequestClose={() => setShowReviewModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />

            {reviewSuccess ? (
              <View style={modalStyles.successState}>
                <View style={modalStyles.successIcon}>
                  <Feather name="check" size={32} color="#059669" />
                </View>
                <Text style={modalStyles.successTitle}>Review Submitted!</Text>
                <Text style={modalStyles.successSub}>Thank you for sharing your experience.</Text>
              </View>
            ) : (
              <>
                <Text style={modalStyles.title}>Rate {business.name}</Text>
                <Text style={modalStyles.subtitle}>Your review helps others make better choices</Text>

                {/* Star picker */}
                <View style={modalStyles.starPicker}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Pressable key={s} onPress={() => setReviewRating(s)} style={modalStyles.starBtn}>
                      <Feather name="star" size={36} color={s <= reviewRating ? "#F59E0B" : "#E5E7EB"} />
                    </Pressable>
                  ))}
                </View>
                <Text style={modalStyles.ratingLabel}>
                  {reviewRating === 5 ? "Excellent! 🎉" : reviewRating === 4 ? "Very Good 👍" : reviewRating === 3 ? "Average 😐" : reviewRating === 2 ? "Poor 😕" : "Terrible 😞"}
                </Text>

                {/* Comment */}
                <TextInput
                  style={modalStyles.commentInput}
                  placeholder="Share your experience (optional)..."
                  placeholderTextColor="#9CA3AF"
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <View style={modalStyles.actions}>
                  <Pressable onPress={() => setShowReviewModal(false)} style={modalStyles.cancelBtn}>
                    <Text style={modalStyles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => submitReview.mutate()}
                    disabled={submitReview.isPending}
                    style={[modalStyles.submitBtn, submitReview.isPending && { opacity: 0.7 }]}
                  >
                    {submitReview.isPending
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={modalStyles.submitText}>Submit Review</Text>
                    }
                  </Pressable>
                </View>
                {submitReview.isError && (
                  <Text style={{ fontFamily: "Manrope_500Medium", color: "#DC2626", textAlign: "center", marginTop: 8, fontSize: 13 }}>
                    Failed to submit. Please try again.
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedOverlay: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  verifiedText: { fontFamily: "Manrope_600SemiBold", fontSize: 12, color: "#fff" },
  infoSection: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 20,
    gap: 14,
  },
  nameBadgeRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  businessName: { fontFamily: "Sora_700Bold", fontSize: 22, color: Colors.light.text, flex: 1, letterSpacing: -0.3 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  ratingText: { fontFamily: "Manrope_700Bold", fontSize: 14, color: "#92400E" },
  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metaChip: { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 20 },
  metaChipText: { fontFamily: "Manrope_600SemiBold", fontSize: 12, color: Colors.light.textSecondary },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoText: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary, flex: 1 },
  description: { fontFamily: "Manrope_400Regular", fontSize: 15, color: Colors.light.text, lineHeight: 22 },
  actionsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { flex: 1, minWidth: 70, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, backgroundColor: "#fff" },
  actionLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 12 },
  inquiryForm: { backgroundColor: Colors.light.backgroundSecondary, borderRadius: 16, padding: 16, gap: 12 },
  inquiryTitle: { fontFamily: "Sora_600SemiBold", fontSize: 16, color: Colors.light.text },
  inquiryInput: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: Colors.light.border, paddingHorizontal: 14, paddingVertical: 10, fontFamily: "Manrope_500Medium", fontSize: 15, color: Colors.light.text },
  inquirySubmit: { height: 48, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  inquirySubmitText: { fontFamily: "Manrope_700Bold", fontSize: 15, color: "#fff" },
  listingsSection: { gap: 8 },
  sectionTitle: { fontFamily: "Sora_700Bold", fontSize: 18, color: Colors.light.text, marginBottom: 4 },
  backPressable: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 10 },

  // Working hours
  hoursCard: { backgroundColor: "#FAFAFA", borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: "#F3F4F6" },
  hoursHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  hoursTitle: { fontFamily: "Sora_700Bold", fontSize: 16, color: Colors.light.text },
  hoursTodayText: { fontFamily: "Manrope_500Medium", fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  hoursRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hoursDay: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: Colors.light.textSecondary },
  hoursDayToday: { color: Colors.primary },
  hoursValue: { fontFamily: "Manrope_500Medium", fontSize: 13, color: Colors.light.text },
  hoursValueToday: { color: Colors.light.text },

  // Location
  locationCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.light.borderLight },
  locationHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  locationTitle: { fontFamily: "Sora_700Bold", fontSize: 16, color: Colors.light.text },
  locationSub: { fontFamily: "Manrope_500Medium", fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  mapWrap: { height: 220, borderRadius: 14, overflow: "hidden", backgroundColor: Colors.light.backgroundSecondary },
  fullMapBtn: { height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary + "30", backgroundColor: Colors.primary + "10", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  fullMapBtnText: { fontFamily: "Manrope_700Bold", fontSize: 13, color: Colors.primary },
  mapOverlay: { position: "absolute", left: 12, right: 12, bottom: 12, gap: 8 },
  mapOverlayChip: { alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.72)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 },
  mapOverlayChipSecondary: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 },
  mapOverlayText: { fontFamily: "Manrope_700Bold", fontSize: 12, color: "#fff" },
  mapOverlayTextSecondary: { fontFamily: "Manrope_700Bold", fontSize: 12, color: Colors.primary },

  fullMapHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  fullMapClose: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -6 },
  fullMapTitle: { flex: 1, fontFamily: "Sora_600SemiBold", fontSize: 16, color: Colors.light.text, textAlign: "center" },
  fullMapPill: { position: "absolute", left: 16, bottom: 16, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: Colors.light.border, opacity: 0.98 },
  fullMapPillText: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: Colors.light.text },
  fullMapActions: { position: "absolute", right: 16, bottom: 16, gap: 10, alignItems: "flex-end" },
  fullMapActionBtn: { backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.primary + "30" },
  fullMapActionBtnSecondary: { backgroundColor: Colors.primary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  fullMapActionText: { fontFamily: "Manrope_700Bold", fontSize: 12, color: Colors.primary },
  fullMapActionTextSecondary: { fontFamily: "Manrope_700Bold", fontSize: 12, color: "#fff" },

  // Reviews
  reviewsSection: { gap: 16 },
  reviewsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  writeReviewBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.primary + "12", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.primary + "30" },
  writeReviewText: { fontFamily: "Manrope_700Bold", fontSize: 13, color: Colors.primary },
  ratingSummary: { flexDirection: "row", gap: 20, backgroundColor: "#FAFAFA", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#F3F4F6" },
  ratingSummaryLeft: { alignItems: "center", gap: 6, minWidth: 70 },
  bigRating: { fontFamily: "Sora_700Bold", fontSize: 42, color: "#1A1A1A", lineHeight: 48 },
  reviewCountText: { fontFamily: "Manrope_400Regular", fontSize: 12, color: "#6B7280" },
  ratingSummaryRight: { flex: 1, gap: 6, justifyContent: "center" },
  noReviews: { alignItems: "center", gap: 8, paddingVertical: 24, backgroundColor: "#FAFAFA", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6" },
  noReviewsText: { fontFamily: "Sora_600SemiBold", fontSize: 16, color: Colors.light.text },
  noReviewsSubText: { fontFamily: "Manrope_400Regular", fontSize: 14, color: "#6B7280" },
  firstReviewBtn: { marginTop: 4, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  firstReviewBtnText: { fontFamily: "Manrope_700Bold", fontSize: 14, color: "#fff" },
});

const reviewStyles = StyleSheet.create({
  card: { backgroundColor: "#FAFAFA", borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: "#F3F4F6" },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Sora_700Bold", fontSize: 16 },
  name: { fontFamily: "Manrope_700Bold", fontSize: 15, color: "#1A1A1A" },
  date: { fontFamily: "Manrope_400Regular", fontSize: 12, color: "#9CA3AF" },
  ratingBubble: { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingNum: { fontFamily: "Manrope_700Bold", fontSize: 13, color: "#92400E" },
  comment: { fontFamily: "Manrope_400Regular", fontSize: 14, color: "#374151", lineHeight: 20 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  title: { fontFamily: "Sora_700Bold", fontSize: 20, color: "#1A1A1A", textAlign: "center" },
  subtitle: { fontFamily: "Manrope_400Regular", fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: -8 },
  starPicker: { flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 8 },
  starBtn: { padding: 4 },
  ratingLabel: { fontFamily: "Manrope_700Bold", fontSize: 16, color: "#1A1A1A", textAlign: "center", marginTop: -8 },
  commentInput: { backgroundColor: "#F9FAFB", borderRadius: 14, borderWidth: 1.5, borderColor: "#E5E7EB", paddingHorizontal: 16, paddingVertical: 12, fontFamily: "Manrope_400Regular", fontSize: 15, color: "#1A1A1A", minHeight: 100 },
  actions: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: "Manrope_600SemiBold", fontSize: 16, color: "#1A1A1A" },
  submitBtn: { flex: 2, height: 52, borderRadius: 14, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  submitText: { fontFamily: "Manrope_700Bold", fontSize: 16, color: "#fff" },
  successState: { alignItems: "center", gap: 12, paddingVertical: 20 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center" },
  successTitle: { fontFamily: "Sora_700Bold", fontSize: 22, color: "#1A1A1A" },
  successSub: { fontFamily: "Manrope_400Regular", fontSize: 15, color: "#6B7280" },
});
