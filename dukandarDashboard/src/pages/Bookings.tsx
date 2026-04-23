import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Plus, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { businessApi, bookingApi, type Business, type BookingSlot } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const formatTime12h = (time: string) => {
  const [h, m] = String(time || "").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
};

const getLatLngFromPoint = (
  point?: { type?: "Point" | string; coordinates?: [number, number] } | null,
): { lat: number; lng: number } | null => {
  const coords = point?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const formatLatLng = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

const getMapsPointUrl = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const getDirectionsEmbedUrl = (
  destination: { lat: number; lng: number },
  origin?: { lat: number; lng: number } | null,
) => {
  const dest = `${destination.lat},${destination.lng}`;
  const org = origin ? `${origin.lat},${origin.lng}` : undefined;

  if (GOOGLE_MAPS_API_KEY) {
    const base = `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
    const originPart = org ? `&origin=${encodeURIComponent(org)}` : "";
    return `${base}${originPart}&destination=${encodeURIComponent(dest)}&mode=driving`;
  }

  // Fallback without API key: show destination (route UI may not render without key)
  return `https://www.google.com/maps?q=${encodeURIComponent(dest)}&z=16&output=embed`;
};

const getMapsDirectionsUrl = (
  destination: { lat: number; lng: number },
  origin?: { lat: number; lng: number } | null,
) => {
  const base = "https://www.google.com/maps/dir/?api=1";
  const dest = `destination=${encodeURIComponent(`${destination.lat},${destination.lng}`)}`;
  const travel = "travelmode=driving";
  if (origin?.lat != null && origin?.lng != null) {
    const org = `origin=${encodeURIComponent(`${origin.lat},${origin.lng}`)}`;
    return `${base}&${org}&${dest}&${travel}`;
  }
  return `${base}&${dest}&${travel}`;
};

const generateSlots = (startTime: string, endTime: string, slotDuration: number) => {
  const slots: Array<{ startTime: string; endTime: string; duration: number }> = [];
  if (!startTime || !endTime || !Number.isFinite(slotDuration) || slotDuration <= 0) return slots;
  let current = startTime;
  while (current < endTime) {
    const [hours, minutes] = current.split(":").map(Number);
    const nextHours = hours + Math.floor((minutes + slotDuration) / 60);
    const nextMinutes = (minutes + slotDuration) % 60;
    const next = `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
    if (next <= endTime) slots.push({ startTime: current, endTime: next, duration: slotDuration });
    current = next;
  }
  return slots;
};

export default function Bookings() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  const [slotDuration, setSlotDuration] = useState("30");

  const [bookings, setBookings] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [recentBookings, setRecentBookings] = useState<BookingSlot[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const [routePopup, setRoutePopup] = useState<{
    open: boolean;
    customer: { name?: string | null; phone?: string | null };
    destination: { lat: number; lng: number };
  }>({ open: false, customer: {}, destination: { lat: 0, lng: 0 } });

  const shopOrigin = useMemo(() => {
    const lat = (business as any)?.address?.coordinates?.latitude;
    const lng = (business as any)?.address?.coordinates?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat: Number(lat), lng: Number(lng) };
  }, [business]);

  const openRoutePopup = (input: {
    customerName?: string | null;
    customerPhone?: string | null;
    destination: { lat: number; lng: number };
  }) => {
    setRoutePopup({
      open: true,
      customer: { name: input.customerName || null, phone: input.customerPhone || null },
      destination: input.destination,
    });
  };

  useEffect(() => {
    if (!business?._id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await bookingApi.getSlotTemplatesForBusiness({ businessId: business._id });
        if (cancelled) return;
        const tpl = res.success && res.data ? res.data[0] : null;
        const btDefaults = (business as any)?.businessType?.defaultBookingTimings;
        const fallbackStart = String(btDefaults?.startTime || "10:00");
        const fallbackEnd = String(btDefaults?.endTime || "18:00");
        const fallbackDur = String(btDefaults?.duration ?? 30);

        if (tpl) {
          setStartTime(tpl.startTime || fallbackStart);
          setEndTime(tpl.endTime || fallbackEnd);
          setSlotDuration(String(tpl.duration ?? fallbackDur));
        } else {
          setStartTime(fallbackStart);
          setEndTime(fallbackEnd);
          setSlotDuration(fallbackDur);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [business?._id]);

  const canEditTimings = useMemo(() => {
    if (!business) return false;
    const byType = (business as any)?.businessType?.ownerCanEditBookingTimings === true;
    const byAdmin = (business as any)?.bookingTimingsOverrideEnabled === true;
    return byType || byAdmin;
  }, [business]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await businessApi.getMyBusinesses({ force: true });
        const b = res.success && res.data ? res.data[0] : null;
        if (!cancelled) setBusiness(b);
      } catch (err: any) {
        if (cancelled) return;
        toast({
          title: t("bookings.toasts.loadBusinessFailedTitle"),
          description: err?.message || t("bookings.toasts.tryAgain"),
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, navigate, toast]);

  const refreshSlots = async () => {
    if (!business?._id || !date) return;
    try {
      setSlotsLoading(true);
      const res = await bookingApi.getBusinessBookings({ businessId: business._id, date });
      if (!res.success || !res.data) throw new Error(res.message || t("bookings.toasts.loadSlotsFailedTitle"));
      setBookings(res.data.bookings || []);
    } catch (err: any) {
      toast({
        title: t("bookings.toasts.loadSlotsFailedTitle"),
        description: err?.message || t("bookings.toasts.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  const refreshRecent = async () => {
    if (!business?._id) return;
    try {
      setRecentLoading(true);
      const res = await bookingApi.getBusinessBookings({ businessId: business._id, status: "booked" });
      if (!res.success || !res.data) throw new Error(res.message || t("bookings.toasts.loadBookingsFailedTitle"));
      const list = (res.data.bookings || [])
        .slice()
        .sort((a: any, b: any) => {
          const ta = a?.bookedAt ? new Date(a.bookedAt).getTime() : 0;
          const tb = b?.bookedAt ? new Date(b.bookedAt).getTime() : 0;
          return tb - ta;
        });
      setRecentBookings(list);
    } catch (err: any) {
      toast({
        title: t("bookings.toasts.loadBookingsFailedTitle"),
        description: err?.message || t("bookings.toasts.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    refreshSlots();
    refreshRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?._id, date]);

  const handleGenerate = async () => {
    if (!business?._id) return;
    const dur = Number.parseInt(slotDuration, 10);
    if (!startTime || !endTime) {
      toast({ title: t("bookings.toasts.startEndRequiredTitle"), variant: "destructive" });
      return;
    }
    if (!Number.isFinite(dur) || dur <= 0) {
      toast({
        title: t("bookings.toasts.invalidDurationTitle"),
        description: t("bookings.toasts.invalidDurationDesc"),
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const res = await bookingApi.replaceSlotTemplates({
        businessId: business._id,
        startTime,
        endTime,
        slotDuration: dur,
      });
      if (!res.success) throw new Error(res.message || t("bookings.toasts.saveTimingsFailedDesc"));
      toast({ title: t("bookings.toasts.timingsSavedTitle"), description: t("bookings.toasts.timingsSavedDesc") });
    } catch (err: any) {
      toast({
        title: t("bookings.toasts.createSlotsFailedTitle"),
        description: err?.message || t("bookings.toasts.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const computedSlots = useMemo(() => {
    const dur = Number.parseInt(slotDuration, 10);
    const base = generateSlots(startTime, endTime, dur);
    const byWindow = new Map<string, BookingSlot>();
    (bookings || []).forEach((b) => byWindow.set(`${b.startTime}-${b.endTime}`, b));
    return base.map((s) => {
      const key = `${s.startTime}-${s.endTime}`;
      const b = byWindow.get(key);
      const booked = !!b?.isBooked || String(b?.status || "") === "booked";
      return {
        key,
        startTime: s.startTime,
        endTime: s.endTime,
        isBooked: booked,
        customerName: b?.customerName || null,
        customerPhone: b?.customerPhone || null,
        customerLocation: b?.customerLocation || null,
      };
    });
  }, [bookings, endTime, slotDuration, startTime]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("bookings.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("bookings.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={refreshSlots} disabled={slotsLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${slotsLoading ? "animate-spin" : ""}`} />
          {t("bookings.actions.refresh")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> {t("bookings.timings.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t("bookings.timings.start")}</div>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={!canEditTimings} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t("bookings.timings.end")}</div>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!canEditTimings} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t("bookings.timings.durationLabel")}</div>
            <Input
              inputMode="numeric"
              value={slotDuration}
              onChange={(e) => setSlotDuration(e.target.value)}
              placeholder={t("bookings.timings.durationPlaceholder")}
              disabled={!canEditTimings}
            />
          </div>

          <div className="md:col-span-4">
            <Button onClick={handleGenerate} disabled={saving || !canEditTimings} className="gap-2">
              <Plus className="h-4 w-4" />
              {saving ? t("bookings.timings.saving") : t("bookings.timings.saveCta")}
            </Button>
            <div className="mt-2 text-xs text-muted-foreground">{t("bookings.timings.note")}</div>
            {!canEditTimings ? (
              <div className="mt-1 text-xs text-muted-foreground">{t("bookings.timings.locked")}</div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>{t("bookings.recent.title")}</span>
            <Button variant="outline" onClick={refreshRecent} disabled={recentLoading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${recentLoading ? "animate-spin" : ""}`} />
              {t("bookings.actions.refresh")}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("bookings.recent.empty")}</p>
          ) : (
            <div className="space-y-2">
              {recentBookings.slice(0, 20).map((b: any) => {
                const dateStr = b?.date ? new Date(b.date).toISOString().slice(0, 10) : "";
                const listingTitle = typeof b?.listing === "object" && b?.listing ? (b.listing.title || "") : "";
                const ll = getLatLngFromPoint(b?.customerLocation);
                return (
                  <div key={b._id} className="p-3 rounded-xl border flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">
                        {dateStr ? `${dateStr} • ` : ""}{formatTime12h(b.startTime)} – {formatTime12h(b.endTime)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {b.customerName ? t("bookings.labels.bookedBy", { name: b.customerName }) : t("bookings.status.booked")}
                        {b.customerPhone ? ` • ${b.customerPhone}` : ""}
                      </div>
                      {ll ? (
                        <div className="text-xs text-muted-foreground truncate">
                          <button
                            type="button"
                            className="underline"
                            onClick={() => openRoutePopup({
                              customerName: b?.customerName,
                              customerPhone: b?.customerPhone,
                              destination: ll,
                            })}
                          >
                            {t("bookings.labels.location")}: {formatLatLng(ll.lat, ll.lng)} ({t("bookings.labels.viewRoute")})
                          </button>
                        </div>
                      ) : null}
                      {listingTitle ? (
                        <div className="text-xs text-muted-foreground truncate">{t("bookings.labels.item")}: {listingTitle}</div>
                      ) : null}
                    </div>
                    <Badge variant="destructive">{t("bookings.status.booked")}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>{t("bookings.slots.title", { date })}</span>
            <div className="w-48">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slotsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : computedSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("bookings.slots.empty")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {computedSlots
                .slice()
                .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
                .map((s) => (
                  <div key={s.key} className="p-3 rounded-xl border flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">{formatTime12h(s.startTime)} – {formatTime12h(s.endTime)}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.customerName ? t("bookings.labels.bookedBy", { name: s.customerName }) : t("bookings.status.available")}
                      </div>
                      {s.customerPhone ? <div className="text-xs text-muted-foreground">{s.customerPhone}</div> : null}
                      {s.isBooked ? (() => {
                        const ll = getLatLngFromPoint(s.customerLocation);
                        if (!ll) return null;
                        return (
                          <div className="text-xs text-muted-foreground">
                            <button
                              type="button"
                              className="underline"
                              onClick={() => openRoutePopup({
                                customerName: s.customerName,
                                customerPhone: s.customerPhone,
                                destination: ll,
                              })}
                            >
                              {t("bookings.labels.location")}: {formatLatLng(ll.lat, ll.lng)} ({t("bookings.labels.viewRoute")})
                            </button>
                          </div>
                        );
                      })() : null}
                    </div>
                    <Badge variant={s.isBooked ? "destructive" : "default"}>
                      {s.isBooked ? t("bookings.status.booked") : t("bookings.status.available")}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={routePopup.open} onOpenChange={(open) => setRoutePopup((s) => ({ ...s, open }))}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-3xl p-0">
          <DialogHeader>
            <div className="px-4 pt-4">
              <DialogTitle>{t("bookings.directions.title")}</DialogTitle>
              <DialogDescription>
                {routePopup.customer?.name
                  ? t("bookings.labels.bookedBy", { name: routePopup.customer.name })
                  : t("bookings.directions.customerFallback")}
                {routePopup.customer?.phone ? ` • ${routePopup.customer.phone}` : ""}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="px-4 pb-4">
            <div className="rounded-lg overflow-hidden border bg-background">
              <iframe
                title={t("bookings.directions.title")}
                src={getDirectionsEmbedUrl(routePopup.destination, shopOrigin)}
                className="w-full h-[60vh] sm:h-[70vh]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {formatLatLng(routePopup.destination.lat, routePopup.destination.lng)}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={getMapsPointUrl(routePopup.destination.lat, routePopup.destination.lng)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("bookings.directions.openLocation")}
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={getMapsDirectionsUrl(routePopup.destination, shopOrigin)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("bookings.directions.openInGoogleMaps")}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
