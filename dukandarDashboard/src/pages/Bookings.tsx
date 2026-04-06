import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock, Plus, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { businessApi, bookingApi, type Business, type BookingSlot } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const formatTime12h = (time: string) => {
  const [h, m] = String(time || "").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
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
  }, [authLoading, isAuthenticated, navigate, toast]);

  const refreshSlots = async () => {
    if (!business?._id || !date) return;
    try {
      setSlotsLoading(true);
      const res = await bookingApi.getBusinessBookings({ businessId: business._id, date });
      if (!res.success || !res.data) throw new Error(res.message || "Failed to load slots");
      setBookings(res.data.bookings || []);
    } catch (err: any) {
      toast({
        title: "Failed to load slots",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    refreshSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?._id, date]);

  const handleGenerate = async () => {
    if (!business?._id) return;
    const dur = Number.parseInt(slotDuration, 10);
    if (!startTime || !endTime) {
      toast({ title: "Start/End time required", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(dur) || dur <= 0) {
      toast({ title: "Invalid duration", description: "Slot duration minutes should be > 0", variant: "destructive" });
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
      if (!res.success) throw new Error(res.message || "Failed to save timings");
      toast({ title: "Timings saved", description: "Customers will choose date while booking." });
    } catch (err: any) {
      toast({
        title: "Failed to create slots",
        description: err?.message || "Please try again.",
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
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-sm text-muted-foreground">Set your daily slot timings. Customers will choose the date while booking.</p>
        </div>
        <Button variant="outline" onClick={refreshSlots} disabled={slotsLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${slotsLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Set Slot Timings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Start</div>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={!canEditTimings} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> End</div>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!canEditTimings} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Slot duration (minutes)</div>
            <Input inputMode="numeric" value={slotDuration} onChange={(e) => setSlotDuration(e.target.value)} placeholder="e.g. 30" disabled={!canEditTimings} />
          </div>

          <div className="md:col-span-4">
            <Button onClick={handleGenerate} disabled={saving || !canEditTimings} className="gap-2">
              <Plus className="h-4 w-4" />
              {saving ? "Saving..." : "Save timings"}
            </Button>
            <div className="mt-2 text-xs text-muted-foreground">Note: You don’t select a date here. Customers pick date while booking.</div>
            {!canEditTimings ? (
              <div className="mt-1 text-xs text-muted-foreground">Editing is locked for your business type. Contact admin/support to enable custom timings.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Slots for {date}</span>
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
            <p className="text-sm text-muted-foreground">Set timings above to see slots.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {computedSlots
                .slice()
                .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
                .map((s) => (
                  <div key={s.key} className="p-3 rounded-xl border flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">{formatTime12h(s.startTime)} – {formatTime12h(s.endTime)}</div>
                      <div className="text-xs text-muted-foreground">{s.customerName ? `Booked by ${s.customerName}` : "Available"}</div>
                    </div>
                    <Badge variant={s.isBooked ? "destructive" : "default"}>{s.isBooked ? "Booked" : "Available"}</Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
