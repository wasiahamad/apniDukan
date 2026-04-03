import PlanCard from "@/components/plan/PlanCard";
import PlanModal from "@/components/plan/PlanModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { usePlan } from "@/context/PlanContext";
import type { Shop } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { useUserLocation } from "@/hooks/useUserLocation";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { API_BASE_URL, fetchNearbyPublicShops } from "@/lib/publicShopsApi";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowRight,
    CalendarClock,
    Eye,
    Facebook,
    Home,
    LocateFixed,
    Lock,
    LogOut,
    Mail,
    MapPin,
    Navigation,
    Settings,
    ShieldCheck,
    Store,
    Upload,
    UserCircle2
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

type Role = "customer" | "business_owner" | "admin" | "staff";
type DashboardTab = "overview" | "location" | "bookings" | "shops" | "plan" | "settings";

type AuthUser = {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    profileImage?: string;
    role: Role;
    isActive?: boolean;
    isEmailVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
    currentLocation?: {
        type?: "Point";
        coordinates?: [number, number];
        accuracy?: number;
        capturedAt?: string;
    };
};

type BookingRow = {
    _id: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    status?: string;
    business?: { name?: string; slug?: string };
    listing?: { title?: string };
};

type MyBookingsResponse = {
    success: boolean;
    message?: string;
    data?: {
        bookings: BookingRow[];
    };
};

const getToken = () => localStorage.getItem("accessToken");
const AVATAR_CACHE_PREFIX = "dukaandirect-avatar-cache:";

const getAvatarCacheKey = (user?: Partial<AuthUser> | null) => {
    if (!user) return "";
    const identity = user._id || user.email;
    if (!identity) return "";
    return `${AVATAR_CACHE_PREFIX}${String(identity).toLowerCase()}`;
};

const readCachedAvatar = (user?: Partial<AuthUser> | null) => {
    try {
        const key = getAvatarCacheKey(user);
        if (!key) return "";
        return localStorage.getItem(key) || "";
    } catch {
        return "";
    }
};

const writeCachedAvatar = (user: Partial<AuthUser> | null | undefined, avatarUrl: string) => {
    try {
        const key = getAvatarCacheKey(user);
        if (!key) return;
        if (avatarUrl) {
            localStorage.setItem(key, avatarUrl);
        } else {
            localStorage.removeItem(key);
        }
    } catch {
        // ignore storage errors
    }
};


const normalizeUser = (user?: Partial<AuthUser> | null): AuthUser | null => {
    if (!user?.email) return null;
    const avatarUrl = user.avatarUrl || user.profileImage || "";
    return {
        ...user,
        avatarUrl,
        profileImage: avatarUrl,
    } as AuthUser;
};

const getStoredUser = (): AuthUser | null => {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return null;
        const parsed = normalizeUser(JSON.parse(raw) as AuthUser);
        if (parsed?.role !== "customer") return null;
        return parsed;
    } catch {
        return null;
    }
};

const getInitials = (value?: string) => {
    const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "CU";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const safeCoord = (value: string | number) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
};

const formatCoord = (value: number) => (Number.isFinite(value) ? value.toFixed(6) : "N/A");

const formatTime = (value?: string) => {
    if (!value) return "Unknown";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return "Unknown";
    }
};

const statusTone = (status?: string) => {
    const s = String(status || "booked").toLowerCase();
    if (s.includes("cancel")) return "bg-red-100 text-red-700 border-red-200";
    if (s.includes("complete") || s.includes("done")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (s.includes("pending")) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
};

function ProfileCard({
    user,
    roleLabel,
    totalBookings,
    locationStatus,
}: {
    user: AuthUser;
    roleLabel: string;
    totalBookings: number;
    locationStatus: string;
}) {
    const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-";
    const lastLogin = user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "Just now";

    return (
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-emerald-50 via-white to-orange-50 shadow-[0_10px_40px_rgba(16,185,129,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(249,115,22,0.16)]">
            <CardContent className="p-6 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-emerald-200">
                            <AvatarImage src={user.avatarUrl} alt={user.name || "Customer"} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold text-lg">
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{user.name || "Customer"}</h2>
                            <p className="text-sm text-slate-600">{user.email || "-"}</p>
                            <p className="text-sm text-slate-600">{user.phone || "Phone not added"}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">{roleLabel}</Badge>
                        <Badge className={user.isActive === false ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"}>
                            {user.isActive === false ? "Inactive" : "Active"}
                        </Badge>
                        <Badge className={user.isEmailVerified ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-orange-100 text-orange-700 border border-orange-200"}>
                            {user.isEmailVerified ? "Verified" : "Unverified"}
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="rounded-xl border border-emerald-100 shadow-none bg-white/70">
                        <CardContent className="p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Total bookings</p>
                            <p className="text-2xl font-bold text-slate-900">{totalBookings}</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl border border-orange-100 shadow-none bg-white/70">
                        <CardContent className="p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Last login</p>
                            <p className="text-sm font-medium text-slate-900">{lastLogin}</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl border border-slate-200 shadow-none bg-white/70">
                        <CardContent className="p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Location status</p>
                            <p className="text-sm font-medium text-slate-900">{locationStatus}</p>
                        </CardContent>
                    </Card>
                </div>

                <p className="text-xs text-slate-500">Joined on {joined}</p>
            </CardContent>
        </Card>
    );
}

function BookingCard({ booking }: { booking: BookingRow }) {
    return (
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="font-semibold text-slate-900">{booking.business?.name || "Shop"}</p>
                        <p className="text-sm text-slate-600">{booking.listing?.title || "Service booking"}</p>
                    </div>
                    <Badge className={`border ${statusTone(booking.status)}`}>{booking.status || "booked"}</Badge>
                </div>
                <p className="text-sm text-slate-500">
                    {booking.date ? new Date(booking.date).toLocaleDateString() : "Date N/A"}
                    {booking.startTime ? ` • ${booking.startTime}${booking.endTime ? ` - ${booking.endTime}` : ""}` : ""}
                </p>
            </CardContent>
        </Card>
    );
}

function ShopCard({ shop }: { shop: Shop & { distanceKm?: number } }) {
    return (
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900 line-clamp-1">{shop.name}</p>
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                        {Number.isFinite(shop.distanceKm) ? `${Number(shop.distanceKm).toFixed(1)} km` : "Nearby"}
                    </Badge>
                </div>
                <p className="text-sm text-slate-600">{shop.category}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{shop.address}</p>
                <Button asChild size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    <Link to={`/shop/${shop.slug}`}>View Shop</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function LocationCard({
    locationLoading,
    userLocation,
    permissionDenied,
    profileLat,
    profileLng,
    manualLat,
    manualLng,
    manualAccuracy,
    onManualLat,
    onManualLng,
    onManualAccuracy,
    onRefresh,
    onUseDevice,
    onSave,
    locationSaveLoading,
    locationCapturedAt,
    mapRef,
    hasMapsKey,
}: {
    locationLoading: boolean;
    userLocation: { latitude: number; longitude: number; accuracy?: number } | null;
    permissionDenied: boolean;
    profileLat: number;
    profileLng: number;
    manualLat: string;
    manualLng: string;
    manualAccuracy: string;
    onManualLat: (v: string) => void;
    onManualLng: (v: string) => void;
    onManualAccuracy: (v: string) => void;
    onRefresh: () => void;
    onUseDevice: () => void;
    onSave: () => void;
    locationSaveLoading: boolean;
    locationCapturedAt: string;
    mapRef: React.RefObject<HTMLDivElement>;
    hasMapsKey: boolean;
}) {
    const accuracy = safeCoord(manualAccuracy || userLocation?.accuracy || "");
    const accuracyScore = Number.isFinite(accuracy) ? Math.max(5, Math.min(100, Math.round(100 - Math.min(accuracy, 100)))) : 0;
    const mapLat = Number.isFinite(safeCoord(manualLat)) ? safeCoord(manualLat) : profileLat;
    const mapLng = Number.isFinite(safeCoord(manualLng)) ? safeCoord(manualLng) : profileLng;

    return (
        <Card className="rounded-2xl border-0 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                    <LocateFixed className="h-5 w-5 text-emerald-600" />
                    Live Location
                </CardTitle>
                <CardDescription>Manage and sync your precise location for better discovery.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                        <span className="relative flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                        </span>
                        Tracking your location
                    </div>
                    <Badge className="bg-white border border-emerald-200 text-emerald-700">
                        {locationLoading ? "Detecting" : userLocation ? "Live" : permissionDenied ? "Permission denied" : "Idle"}
                    </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                        <p className="text-xs uppercase text-slate-500">Profile Latitude</p>
                        <p className="text-sm font-semibold text-slate-900">{formatCoord(profileLat)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                        <p className="text-xs uppercase text-slate-500">Profile Longitude</p>
                        <p className="text-sm font-semibold text-slate-900">{formatCoord(profileLng)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="manualLat">Latitude</Label>
                        <Input id="manualLat" value={manualLat} onChange={(e) => onManualLat(e.target.value)} placeholder="28.6139" inputMode="decimal" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="manualLng">Longitude</Label>
                        <Input id="manualLng" value={manualLng} onChange={(e) => onManualLng(e.target.value)} placeholder="77.2090" inputMode="decimal" />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="manualAccuracy">Accuracy (meters)</Label>
                    <Input id="manualAccuracy" value={manualAccuracy} onChange={(e) => onManualAccuracy(e.target.value)} placeholder="25" inputMode="decimal" />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Location accuracy quality</span>
                        <span>{Number.isFinite(accuracy) ? `${Math.round(accuracy)} m` : "N/A"}</span>
                    </div>
                    <Progress value={accuracyScore} className="h-2 bg-orange-100 [&>div]:bg-emerald-500" />
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                    {Number.isFinite(mapLat) && Number.isFinite(mapLng) && !hasMapsKey ? (
                        <iframe
                            title="Google Map Preview"
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(`${mapLat},${mapLng}`)}&z=15&output=embed`}
                            className="h-52 w-full border-0"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    ) : (
                        <div ref={mapRef} className="h-52 w-full bg-slate-100" />
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button onClick={onRefresh} variant="outline" className="border-emerald-200 hover:bg-emerald-50">
                        Refresh Location
                    </Button>
                    <Button onClick={onUseDevice} variant="secondary" disabled={!userLocation}>
                        Use Device Location
                    </Button>
                    <Button onClick={onSave} disabled={locationSaveLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
                        {locationSaveLoading ? "Saving..." : "Save Location"}
                    </Button>
                </div>

                <p className="text-xs text-slate-500">Last synced: {locationCapturedAt}</p>
            </CardContent>
        </Card>
    );
}

export default function AccountPage() {
    const location = useLocation();
    const { user: authUser, logout: authLogout, updateUser } = useAuth();
    const [mode, setMode] = useState<"login" | "register">("login");
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState(false);
    const [error, setError] = useState("");
    const [forgotOpen, setForgotOpen] = useState(false);
    const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotOtp, setForgotOtp] = useState("");
    const [forgotNewPassword, setForgotNewPassword] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState("");
    const [forgotMessage, setForgotMessage] = useState("");
    const [currentUser, setCurrentUser] = useState<AuthUser | null>((authUser as AuthUser | null) || getStoredUser());
    const [customerOnlyNotice, setCustomerOnlyNotice] = useState("");
    const [manualLat, setManualLat] = useState("");
    const [manualLng, setManualLng] = useState("");
    const [manualAccuracy, setManualAccuracy] = useState("");
    const [locationSaveLoading, setLocationSaveLoading] = useState(false);
    const [locationSaveError, setLocationSaveError] = useState("");
    const [locationSaveMessage, setLocationSaveMessage] = useState("");
    const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nearbyCoords, setNearbyCoords] = useState<{ lat: number; lng: number } | null>(null);

    const { userLocation, requestLocation, permissionDenied, loading: locationLoading } = useUserLocation();
    const { toast } = useToast();
    const { plans, currentPlan, currentPlanId, planExpiry, selectPlan } = usePlan();
    const [planModalOpen, setPlanModalOpen] = useState(false);

    const locationMapRef = useRef<HTMLDivElement | null>(null);
    const locationMapInstanceRef = useRef<any>(null);
    const locationMarkerRef = useRef<any>(null);
    const avatarInputRef = useRef<HTMLInputElement | null>(null);

    const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
    const facebookAppId = (import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined)?.trim();
    const mapsKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();

    const loadGoogleScript = async () => {
        if ((window as any).google?.accounts?.oauth2?.initTokenClient) return;

        await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector('script[data-google-gsi="1"]') as HTMLScriptElement | null;
            if (existing) {
                existing.addEventListener("load", () => resolve(), { once: true });
                existing.addEventListener("error", () => reject(new Error("Google SDK failed to load")), { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.dataset.googleGsi = "1";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Google SDK failed to load"));
            document.head.appendChild(script);
        });
    };

    const loadFacebookScript = async () => {
        if ((window as any).FB?.login) return;

        await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector('script[data-facebook-sdk="1"]') as HTMLScriptElement | null;
            if (existing) {
                existing.addEventListener("load", () => resolve(), { once: true });
                existing.addEventListener("error", () => reject(new Error("Facebook SDK failed to load")), { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = "https://connect.facebook.net/en_US/sdk.js";
            script.async = true;
            script.defer = true;
            script.dataset.facebookSdk = "1";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Facebook SDK failed to load"));
            document.head.appendChild(script);
        });
    };

    const persistSession = (authData: any) => {
        const normalizedUser = normalizeUser(authData?.user);
        if (!normalizedUser) return;

        localStorage.setItem("accessToken", authData.accessToken);
        localStorage.setItem("refreshToken", authData.refreshToken || "");
        localStorage.setItem("user", JSON.stringify(normalizedUser));
        setCurrentUser(normalizedUser);
        setPassword("");
        toast({ title: "Welcome", description: "Customer session active." });
    };

    useEffect(() => {
        const handler = () => setCurrentUser(getStoredUser());
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
    }, []);

    useEffect(() => {
        setCurrentUser((authUser as AuthUser | null) || null);
    }, [authUser]);

    useEffect(() => {
        setCurrentUser((prev) => {
            if (!prev) return prev;
            if (prev.avatarUrl) return prev;

            const cachedAvatar = readCachedAvatar(prev) || readCachedAvatar(authUser as AuthUser | null);
            if (!cachedAvatar) return prev;

            return { ...prev, avatarUrl: cachedAvatar };
        });
    }, [authUser]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        if (tab === "bookings") {
            setActiveTab("bookings");
        } else if (tab === "location") {
            setActiveTab("location");
        } else if (tab === "shops") {
            setActiveTab("shops");
        } else if (tab === "plan") {
            setActiveTab("plan");
        } else if (tab === "settings") {
            setActiveTab("settings");
        } else if (tab === "overview") {
            setActiveTab("overview");
        }
    }, [location.search]);

    useEffect(() => {
        if (!currentUser) return;
        try {
            requestLocation();
        } catch {
            // ignore
        }
    }, [currentUser, requestLocation]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem("user");
            if (!raw) return;
            const parsed = JSON.parse(raw) as AuthUser;
            if (parsed?.role && parsed.role !== "customer") {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("user");
                setCurrentUser(null);
                setCustomerOnlyNotice("Ye panel sirf customer accounts ke liye hai. Owner account yahan login nahi hoga.");
            }
        } catch {
            // ignore
        }
    }, []);

    const bookingsQuery = useQuery({
        queryKey: ["customer-bookings", currentUser?._id || null],
        enabled: !!currentUser && !!getToken(),
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/bookings/my`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const json = (await response.json()) as MyBookingsResponse;
            if (!response.ok || !json.success) {
                throw new Error(json.message || "Failed to load bookings");
            }
            return json.data?.bookings || [];
        },
    });

    const meQuery = useQuery({
        queryKey: ["customer-me", currentUser?._id || null],
        enabled: !!currentUser && !!getToken(),
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const json = await response.json();
            const user = normalizeUser(json?.data as AuthUser | undefined);
            if (!response.ok || !json?.success || !user) {
                throw new Error(json?.message || "Failed to load profile");
            }
            if (user.role !== "customer") {
                throw new Error("Only customer profile is allowed");
            }
            return user;
        },
    });

    const nearbyShopsQuery = useQuery({
        queryKey: ["customer-nearby-shops", nearbyCoords?.lat ?? null, nearbyCoords?.lng ?? null],
        enabled: false,
        queryFn: async () => {
            if (!nearbyCoords) return [] as Shop[];
            return fetchNearbyPublicShops({ lat: nearbyCoords.lat, lng: nearbyCoords.lng, radiusKm: 25, limit: 8 });
        },
    });

    const submit = async () => {
        setError("");
        setLoading(true);
        try {
            const endpoint = mode === "register" ? "/auth/register/customer" : "/auth/login/customer";
            const payload =
                mode === "register"
                    ? { name: name.trim(), phone: phone.trim(), email: email.trim(), password, role: "customer" }
                    : { email: email.trim(), password };

            if (mode === "register" && String(phone).trim().length !== 10) {
                throw new Error("Mobile number 10 digits ka hona chahiye");
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await response.json();

            const authData = json?.data;
            if (!response.ok || !json?.success || !authData?.accessToken || !authData?.user) {
                throw new Error(json?.message || "Authentication failed");
            }

            if (authData.user.role !== "customer") {
                throw new Error("Sirf customer account se login allowed hai");
            }

            persistSession(authData);
        } catch (e: any) {
            const msg = e?.message || "Auth failed";
            setError(msg);
            toast({ title: "Authentication failed", description: msg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const requestForgotOtp = async () => {
        const emailToUse = (forgotEmail || email).trim();
        setForgotError("");
        setForgotMessage("");

        if (!emailToUse) {
            setForgotError("Email required");
            return;
        }

        setForgotLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailToUse }),
            });
            const json = await response.json();

            if (!response.ok || !json?.success) {
                throw new Error(json?.message || "Failed to send reset OTP");
            }

            setForgotEmail(emailToUse);
            setForgotStep("verify");
            setForgotMessage("OTP sent. Inbox check karo.");
            toast({ title: "OTP sent", description: "Password reset OTP has been sent." });
        } catch (e: any) {
            const msg = e?.message || "Failed to send OTP";
            setForgotError(msg);
            toast({ title: "Failed", description: msg, variant: "destructive" });
        } finally {
            setForgotLoading(false);
        }
    };

    const resendForgotOtp = async () => {
        setForgotError("");
        setForgotMessage("");

        if (!forgotEmail.trim()) {
            setForgotError("Email required");
            return;
        }

        setForgotLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/resend-reset-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotEmail.trim() }),
            });
            const json = await response.json();
            if (!response.ok || !json?.success) {
                throw new Error(json?.message || "Failed to resend OTP");
            }

            setForgotMessage("OTP resend ho gaya.");
            toast({ title: "OTP resent", description: "Please check your inbox." });
        } catch (e: any) {
            const msg = e?.message || "Failed to resend OTP";
            setForgotError(msg);
            toast({ title: "Failed", description: msg, variant: "destructive" });
        } finally {
            setForgotLoading(false);
        }
    };

    const resetPasswordWithOtp = async () => {
        setForgotError("");
        setForgotMessage("");

        if (!forgotEmail.trim() || !forgotOtp.trim() || forgotNewPassword.length < 6) {
            setForgotError("Email, OTP aur 6+ char new password required");
            return;
        }

        setForgotLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: forgotEmail.trim(),
                    otp: forgotOtp.trim(),
                    newPassword: forgotNewPassword,
                }),
            });
            const json = await response.json();
            const authData = json?.data;

            if (!response.ok || !json?.success) {
                throw new Error(json?.message || "Failed to reset password");
            }

            if (authData?.accessToken && authData?.user?.role === "customer") {
                persistSession(authData);
                setForgotOpen(false);
                setForgotStep("request");
                setForgotOtp("");
                setForgotNewPassword("");
                setForgotMessage("");
                toast({ title: "Password reset", description: "Signed in successfully." });
                return;
            }

            setForgotMessage("Password reset successful. Ab login karo.");
            setForgotOpen(false);
            setForgotStep("request");
            toast({ title: "Password reset", description: "Now login with your new password." });
        } catch (e: any) {
            const msg = e?.message || "Failed to reset password";
            setForgotError(msg);
            toast({ title: "Reset failed", description: msg, variant: "destructive" });
        } finally {
            setForgotLoading(false);
        }
    };

    const handleGoogleCustomerAuth = async () => {
        setError("");

        if (!googleClientId) {
            const msg = "Google login abhi configure nahi hai (VITE_GOOGLE_CLIENT_ID missing).";
            setError(msg);
            toast({ title: "Google unavailable", description: msg, variant: "destructive" });
            return;
        }

        setSocialLoading(true);
        try {
            await loadGoogleScript();
            const google = (window as any).google;
            if (!google?.accounts?.oauth2?.initTokenClient) {
                throw new Error("Google SDK unavailable");
            }

            const accessToken = await new Promise<string>((resolve, reject) => {
                let settled = false;
                const tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: googleClientId,
                    scope: "openid email profile",
                    callback: (response: any) => {
                        settled = true;
                        if (response?.error) {
                            reject(new Error(response.error_description || response.error || "Google auth failed"));
                            return;
                        }
                        if (!response?.access_token) {
                            reject(new Error("Google access token not received"));
                            return;
                        }
                        resolve(response.access_token);
                    },
                });

                tokenClient.requestAccessToken({ prompt: "consent" });
                window.setTimeout(() => {
                    if (!settled) reject(new Error("Google auth timed out or cancelled"));
                }, 20000);
            });

            const response = await fetch(`${API_BASE_URL}/auth/social/google/customer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken }),
            });
            const json = await response.json();
            const authData = json?.data;

            if (!response.ok || !json?.success || !authData?.accessToken || !authData?.user) {
                throw new Error(json?.message || "Google authentication failed");
            }
            if (authData.user.role !== "customer") {
                throw new Error("Sirf customer account se login allowed hai");
            }

            persistSession(authData);
        } catch (e: any) {
            const msg = e?.message || "Google login failed";
            setError(msg);
            toast({ title: "Google login failed", description: msg, variant: "destructive" });
        } finally {
            setSocialLoading(false);
        }
    };

    const handleFacebookCustomerAuth = async () => {
        setError("");

        if (!facebookAppId) {
            const msg = "Facebook login abhi configure nahi hai (VITE_FACEBOOK_APP_ID missing).";
            setError(msg);
            toast({ title: "Facebook unavailable", description: msg, variant: "destructive" });
            return;
        }

        setSocialLoading(true);
        try {
            await loadFacebookScript();
            const FB = (window as any).FB;
            if (!FB?.init || !FB?.login) {
                throw new Error("Facebook SDK unavailable");
            }

            FB.init({
                appId: facebookAppId,
                cookie: true,
                xfbml: false,
                version: "v19.0",
            });

            const accessToken = await new Promise<string>((resolve, reject) => {
                FB.login(
                    (response: any) => {
                        const token = response?.authResponse?.accessToken;
                        if (!token) {
                            reject(new Error("Facebook login cancelled or token not received"));
                            return;
                        }
                        resolve(token);
                    },
                    { scope: "email,public_profile" }
                );
            });

            const response = await fetch(`${API_BASE_URL}/auth/social/facebook/customer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken }),
            });
            const json = await response.json();
            const authData = json?.data;

            if (!response.ok || !json?.success || !authData?.accessToken || !authData?.user) {
                throw new Error(json?.message || "Facebook authentication failed");
            }
            if (authData.user.role !== "customer") {
                throw new Error("Sirf customer account se login allowed hai");
            }

            persistSession(authData);
        } catch (e: any) {
            const msg = e?.message || "Facebook login failed";
            setError(msg);
            toast({ title: "Facebook login failed", description: msg, variant: "destructive" });
        } finally {
            setSocialLoading(false);
        }
    };

    const logout = () => {
        authLogout();
        setCurrentUser(null);
        toast({ title: "Signed out", description: "You have been logged out." });
    };

    const handleAvatarUpload = async (file?: File | null) => {
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast({ title: "Invalid file", description: "Please choose an image file.", variant: "destructive" });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast({ title: "File too large", description: "Please upload image under 2MB.", variant: "destructive" });
            return;
        }

        try {
            const formData = new FormData();
            formData.append("file", file);

            const uploadRes = await fetch(`${API_BASE_URL}/upload/avatar`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                },
                body: formData,
            });
            const uploadJson = await uploadRes.json();

            if (!uploadRes.ok || !uploadJson?.success) {
                throw new Error(uploadJson?.message || "Failed to upload avatar");
            }

            const avatarUrl = uploadJson?.data?.url as string | undefined;
            const updatedUser = normalizeUser(uploadJson?.data?.user as AuthUser | undefined);

            if (!avatarUrl || !updatedUser) {
                throw new Error("Invalid avatar upload response");
            }

            writeCachedAvatar(currentUser || (authUser as AuthUser | null), avatarUrl);
            updateUser({ avatarUrl, profileImage: avatarUrl });
            setCurrentUser((prev) => (prev ? { ...prev, ...updatedUser } : updatedUser));
            toast({ title: "Profile photo updated", description: "Your new avatar is now visible." });

        } catch (e: any) {
            toast({ title: "Upload failed", description: e?.message || "Could not upload photo.", variant: "destructive" });
        }
    };

    const removeAvatar = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ profileImage: "" }),
            });
            const json = await response.json();
            const updatedUser = normalizeUser(json?.data as AuthUser | undefined);

            if (!response.ok || !json?.success || !updatedUser) {
                throw new Error(json?.message || "Failed to remove profile photo");
            }

            writeCachedAvatar(currentUser || (authUser as AuthUser | null), "");
            updateUser({ avatarUrl: "", profileImage: "" });
            setCurrentUser((prev) => (prev ? { ...prev, ...updatedUser, avatarUrl: "", profileImage: "" } : prev));
            toast({ title: "Photo removed", description: "Initials avatar restored." });
        } catch (e: any) {
            toast({ title: "Remove failed", description: e?.message || "Could not remove photo.", variant: "destructive" });
        }
    };

    const bookingRows = bookingsQuery.data || [];

    const cachedAvatarUrl = useMemo(
        () => readCachedAvatar(currentUser) || readCachedAvatar(meQuery.data) || readCachedAvatar(authUser as AuthUser | null),
        [currentUser?._id, currentUser?.email, meQuery.data?._id, meQuery.data?.email, authUser],
    );

    const displayedUser = useMemo<AuthUser | null>(() => {
        if (!currentUser && !meQuery.data) return null;

        const merged = {
            ...(currentUser || {}),
            ...(meQuery.data || {}),
        } as AuthUser;

        merged.avatarUrl = meQuery.data?.avatarUrl || currentUser?.avatarUrl || authUser?.avatarUrl || cachedAvatarUrl || "";
        return merged;
    }, [currentUser, meQuery.data, authUser?.avatarUrl, cachedAvatarUrl]);

    const profileAvatarUrl = displayedUser?.avatarUrl || currentUser?.avatarUrl || authUser?.avatarUrl || cachedAvatarUrl || "";

    const roleLabel = useMemo(() => {
        if (!displayedUser?.role) return "Guest";
        if (displayedUser.role === "business_owner") return "Business Owner";
        return "Customer";
    }, [displayedUser?.role]);

    const backendLocation = displayedUser?.currentLocation?.coordinates;
    const backendLat = Array.isArray(backendLocation) ? Number(backendLocation[1]) : NaN;
    const backendLng = Array.isArray(backendLocation) ? Number(backendLocation[0]) : NaN;

    const locationCapturedAt = displayedUser?.currentLocation?.capturedAt
        ? new Date(displayedUser.currentLocation.capturedAt).toLocaleString()
        : "Not synced yet";

    useEffect(() => {
        if (!Number.isFinite(backendLat) || !Number.isFinite(backendLng)) return;
        setManualLat(String(backendLat));
        setManualLng(String(backendLng));
        if (Number.isFinite(displayedUser?.currentLocation?.accuracy as number)) {
            setManualAccuracy(String(displayedUser?.currentLocation?.accuracy || ""));
        }
    }, [backendLat, backendLng, displayedUser?.currentLocation?.accuracy]);

    const saveLocationManually = async () => {
        setLocationSaveError("");
        setLocationSaveMessage("");

        const lat = Number.parseFloat(manualLat);
        const lng = Number.parseFloat(manualLng);
        const accuracy = Number.parseFloat(manualAccuracy);

        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
            setLocationSaveError("Latitude valid hona chahiye (-90 to 90)");
            toast({ title: "Invalid latitude", description: "Use a valid value between -90 and 90", variant: "destructive" });
            return;
        }
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
            setLocationSaveError("Longitude valid hona chahiye (-180 to 180)");
            toast({ title: "Invalid longitude", description: "Use a valid value between -180 and 180", variant: "destructive" });
            return;
        }

        setLocationSaveLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/location`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    latitude: lat,
                    longitude: lng,
                    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
                }),
            });
            const json = await response.json();

            if (!response.ok || !json?.success) {
                throw new Error(json?.message || "Location save failed");
            }

            setLocationSaveMessage("Location profile me save ho gayi.");
            toast({ title: "Location updated", description: "Your profile location was synced." });
            await meQuery.refetch();
        } catch (e: any) {
            const msg = e?.message || "Location save failed";
            setLocationSaveError(msg);
            toast({ title: "Location save failed", description: msg, variant: "destructive" });
        } finally {
            setLocationSaveLoading(false);
        }
    };

    const refreshLiveLocation = () => {
        requestLocation();
        toast({ title: "Refreshing", description: "Requesting latest device location..." });
    };

    const useDeviceLocation = () => {
        if (!userLocation) return;
        setManualLat(String(userLocation.latitude));
        setManualLng(String(userLocation.longitude));
        setManualAccuracy(Number.isFinite(userLocation.accuracy as number) ? String(userLocation.accuracy) : "");
        toast({ title: "Device location applied", description: "Coordinates filled from your device." });
    };

    const fetchNearby = async (lat: number, lng: number) => {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            toast({ title: "Location missing", description: "Please save a valid location first.", variant: "destructive" });
            return;
        }
        setNearbyCoords({ lat, lng });
        await nearbyShopsQuery.refetch();
    };

    useEffect(() => {
        if (!currentUser) return;
        if (!Number.isFinite(backendLat) || !Number.isFinite(backendLng)) return;
        fetchNearby(backendLat, backendLng);
    }, [currentUser?._id, backendLat, backendLng]);

    const mapLat = useMemo(() => {
        const manual = safeCoord(manualLat);
        if (Number.isFinite(manual)) return manual;
        if (Number.isFinite(backendLat)) return backendLat;
        if (Number.isFinite(userLocation?.latitude as number)) return Number(userLocation?.latitude);
        return NaN;
    }, [manualLat, backendLat, userLocation?.latitude]);

    const mapLng = useMemo(() => {
        const manual = safeCoord(manualLng);
        if (Number.isFinite(manual)) return manual;
        if (Number.isFinite(backendLng)) return backendLng;
        if (Number.isFinite(userLocation?.longitude as number)) return Number(userLocation?.longitude);
        return NaN;
    }, [manualLng, backendLng, userLocation?.longitude]);

    useEffect(() => {
        if (!mapsKey || !locationMapRef.current) return;
        if (!Number.isFinite(mapLat) || !Number.isFinite(mapLng)) return;

        let cancelled = false;
        (async () => {
            try {
                await loadGoogleMaps(mapsKey);
                if (cancelled) return;
                const google = (window as any).google;
                if (!google?.maps) return;

                const center = { lat: mapLat, lng: mapLng };
                if (!locationMapInstanceRef.current) {
                    locationMapInstanceRef.current = new google.maps.Map(locationMapRef.current, {
                        center,
                        zoom: 15,
                        disableDefaultUI: true,
                        zoomControl: true,
                        mapTypeControl: false,
                        fullscreenControl: false,
                    });
                } else {
                    locationMapInstanceRef.current.setCenter(center);
                }

                if (!locationMarkerRef.current) {
                    locationMarkerRef.current = new google.maps.Marker({
                        position: center,
                        map: locationMapInstanceRef.current,
                        title: "Your Location",
                    });
                } else {
                    locationMarkerRef.current.setPosition(center);
                }
            } catch {
                // no-op fallback is iframe in UI
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [mapsKey, mapLat, mapLng]);

    const locationStatus = Number.isFinite(backendLat) && Number.isFinite(backendLng) ? "Synced" : "Not synced";

    const navItems: Array<{ key: DashboardTab; label: string; icon: typeof Home }> = [
        { key: "overview", label: "Profile Overview", icon: UserCircle2 },
        { key: "location", label: "Live Location", icon: Navigation },
        { key: "bookings", label: "My Bookings", icon: CalendarClock },
        { key: "shops", label: "Nearby Shops", icon: Store },
        { key: "plan", label: "My Plan", icon: ShieldCheck },
        { key: "settings", label: "Settings", icon: Settings },
    ];

    if (!currentUser) {
        return (
            <section className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top_left,#ecfdf5,transparent_40%),radial-gradient(circle_at_top_right,#fff7ed,transparent_35%),linear-gradient(#ffffff,#f8fafc)] py-8">
                <div className="container">
                    <div className="max-w-2xl mx-auto">
                        <Card className="rounded-3xl border-0 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
                            <CardHeader>
                                <CardTitle className="text-3xl font-black tracking-tight text-slate-900">{mode === "register" ? "Create Account" : "Welcome Back"}</CardTitle>
                                <CardDescription>{mode === "register" ? "Signup as customer and start booking nearby services" : "Login as customer to continue"}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {mode === "register" ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" className="h-12" />
                                    </div>
                                ) : null}

                                {mode === "register" ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Mobile Number</Label>
                                        <Input
                                            id="phone"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                                            placeholder="9876543210"
                                            className="h-12"
                                            inputMode="numeric"
                                            maxLength={10}
                                        />
                                    </div>
                                ) : null}

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="h-12 pl-10" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="h-12 pl-10 pr-10" />
                                        <Eye className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    </div>
                                </div>

                                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                                {customerOnlyNotice ? <p className="text-sm text-destructive">{customerOnlyNotice}</p> : null}

                                <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={loading || !email || !password || (mode === "register" && (!name || phone.length !== 10))}>
                                    {loading ? "Please wait..." : mode === "register" ? "Sign Up" : "Login"} <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>

                                {mode === "login" ? (
                                    <button
                                        type="button"
                                        className="w-full text-center text-emerald-700 font-medium hover:underline"
                                        onClick={() => {
                                            setForgotOpen((prev) => !prev);
                                            setForgotError("");
                                            setForgotMessage("");
                                            if (!forgotEmail && email) setForgotEmail(email);
                                        }}
                                    >
                                        Forgot password?
                                    </button>
                                ) : null}

                                {mode === "login" && forgotOpen ? (
                                    <div className="rounded-xl border border-slate-200 p-3 space-y-3 bg-slate-50">
                                        <p className="text-sm font-medium">Reset Password via OTP</p>
                                        <div className="space-y-2">
                                            <Label htmlFor="forgotEmail">Email</Label>
                                            <Input id="forgotEmail" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="your@email.com" />
                                        </div>

                                        {forgotStep === "verify" ? (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="forgotOtp">OTP</Label>
                                                    <Input id="forgotOtp" value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value)} placeholder="6 digit OTP" maxLength={6} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="forgotNewPassword">New Password</Label>
                                                    <Input id="forgotNewPassword" type="password" value={forgotNewPassword} onChange={(e) => setForgotNewPassword(e.target.value)} placeholder="New password" />
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button size="sm" onClick={resetPasswordWithOtp} disabled={forgotLoading}>
                                                        {forgotLoading ? "Please wait..." : "Reset Password"}
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={resendForgotOtp} disabled={forgotLoading}>
                                                        Resend OTP
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <Button size="sm" onClick={requestForgotOtp} disabled={forgotLoading}>
                                                {forgotLoading ? "Please wait..." : "Send OTP"}
                                            </Button>
                                        )}

                                        {forgotError ? <p className="text-xs text-destructive">{forgotError}</p> : null}
                                        {forgotMessage ? <p className="text-xs text-emerald-700">{forgotMessage}</p> : null}
                                    </div>
                                ) : null}

                                <div className="relative text-center text-xs tracking-wide text-muted-foreground py-2">
                                    <span className="px-3 bg-card relative z-10">OR CONTINUE WITH</span>
                                    <span className="absolute left-0 right-0 top-1/2 border-t -z-0" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Button variant="outline" className="h-11" onClick={handleGoogleCustomerAuth} disabled={socialLoading}>
                                        <span className="text-base mr-2">G</span> {socialLoading ? "Connecting..." : "Google"}
                                    </Button>
                                    <Button variant="outline" className="h-11" onClick={handleFacebookCustomerAuth} disabled={socialLoading}>
                                        <Facebook className="w-4 h-4 mr-2" /> {socialLoading ? "Connecting..." : "Facebook"}
                                    </Button>
                                </div>

                                <Button
                                    variant="ghost"
                                    className="w-full"
                                    onClick={() => {
                                        setMode(mode === "register" ? "login" : "register");
                                        setError("");
                                    }}
                                >
                                    {mode === "register" ? "Already have an account? Login" : "Don't have an account? Sign Up"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top_left,#ecfdf5,transparent_35%),radial-gradient(circle_at_top_right,#fff7ed,transparent_30%),linear-gradient(#ffffff,#f8fafc)] py-6 md:py-8">
            <div className="container">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px,1fr]">
                    <aside className="lg:sticky lg:top-24 h-fit">
                        <Card className="rounded-2xl border-0 bg-white/90 backdrop-blur shadow-[0_14px_36px_rgba(15,23,42,0.12)]">
                            <CardContent className="p-5 space-y-5">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12 border border-emerald-200">
                                        <AvatarImage src={profileAvatarUrl} alt={displayedUser?.name || "Customer"} />
                                        <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">
                                            {getInitials(displayedUser?.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900 truncate">{displayedUser?.name || "Customer"}</p>
                                        <p className="text-xs text-slate-500 truncate">{displayedUser?.email || "-"}</p>
                                    </div>
                                </div>

                                <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 w-fit">Customer</Badge>

                                <nav className="space-y-2">
                                    {navItems.map((item) => {
                                        const Icon = item.icon;
                                        const active = activeTab === item.key;
                                        return (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => setActiveTab(item.key)}
                                                className={`w-full rounded-xl px-3 py-2.5 text-left flex items-center gap-2 transition-all duration-200 ${active
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                        : "text-slate-600 border border-transparent hover:bg-slate-50"
                                                    }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                <span className="text-sm font-medium">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </nav>

                                <Button variant="outline" className="w-full mt-3 border-orange-200 text-orange-700 hover:bg-orange-50" onClick={logout}>
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Logout
                                </Button>
                            </CardContent>
                        </Card>
                    </aside>

                    <main className="space-y-6 animate-in fade-in-50 duration-500">
                        {activeTab === "overview" ? (
                            <>
                                {displayedUser ? (
                                    <ProfileCard
                                        user={displayedUser}
                                        roleLabel={roleLabel}
                                        totalBookings={bookingRows.length}
                                        locationStatus={locationStatus}
                                    />
                                ) : (
                                    <Card className="rounded-2xl">
                                        <CardContent className="p-6 space-y-3">
                                            <Skeleton className="h-6 w-56" />
                                            <Skeleton className="h-5 w-72" />
                                        </CardContent>
                                    </Card>
                                )}

                                <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-slate-900">Profile Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                                            <p className="text-xs text-slate-500">User ID</p>
                                            <p className="font-medium text-slate-900 break-all">{displayedUser?._id || "-"}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                                            <p className="text-xs text-slate-500">Email Verified</p>
                                            <p className="font-medium text-slate-900">{displayedUser?.isEmailVerified ? "Yes" : "No"}</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-slate-900">Profile Photo</CardTitle>
                                        <CardDescription>Upload a profile picture just like modern apps.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <Avatar className="h-20 w-20 border-2 border-emerald-200">
                                            <AvatarImage src={profileAvatarUrl} alt={displayedUser?.name || "Customer"} />
                                            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold text-lg">
                                                {getInitials(displayedUser?.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-wrap gap-2">
                                            <input
                                                ref={avatarInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    handleAvatarUpload(file);
                                                    e.currentTarget.value = "";
                                                }}
                                            />
                                            <Button
                                                variant="outline"
                                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                onClick={() => avatarInputRef.current?.click()}
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                {displayedUser?.avatarUrl ? "Change Photo" : "Upload Photo"}
                                            </Button>
                                            {displayedUser?.avatarUrl ? (
                                                <Button variant="outline" className="border-slate-300" onClick={removeAvatar}>
                                                    Remove
                                                </Button>
                                            ) : null}
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        ) : null}

                        {activeTab === "location" ? (
                            <>
                                <LocationCard
                                    locationLoading={locationLoading}
                                    userLocation={userLocation}
                                    permissionDenied={permissionDenied}
                                    profileLat={backendLat}
                                    profileLng={backendLng}
                                    manualLat={manualLat}
                                    manualLng={manualLng}
                                    manualAccuracy={manualAccuracy}
                                    onManualLat={setManualLat}
                                    onManualLng={setManualLng}
                                    onManualAccuracy={setManualAccuracy}
                                    onRefresh={refreshLiveLocation}
                                    onUseDevice={useDeviceLocation}
                                    onSave={saveLocationManually}
                                    locationSaveLoading={locationSaveLoading}
                                    locationCapturedAt={locationCapturedAt}
                                    mapRef={locationMapRef}
                                    hasMapsKey={!!mapsKey}
                                />

                                {locationSaveError ? (
                                    <Card className="rounded-xl border border-red-200 bg-red-50">
                                        <CardContent className="p-3 text-sm text-red-700">{locationSaveError}</CardContent>
                                    </Card>
                                ) : null}

                                {locationSaveMessage ? (
                                    <Card className="rounded-xl border border-emerald-200 bg-emerald-50">
                                        <CardContent className="p-3 text-sm text-emerald-700">{locationSaveMessage}</CardContent>
                                    </Card>
                                ) : null}
                            </>
                        ) : null}

                        {activeTab === "bookings" ? (
                            <Card className="rounded-2xl border-0 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                                <CardHeader>
                                    <CardTitle className="text-slate-900">My Bookings</CardTitle>
                                    <CardDescription>Track upcoming and past service bookings.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {bookingsQuery.isLoading ? (
                                        <div className="space-y-3">
                                            <Skeleton className="h-28 w-full rounded-2xl" />
                                            <Skeleton className="h-28 w-full rounded-2xl" />
                                            <Skeleton className="h-28 w-full rounded-2xl" />
                                        </div>
                                    ) : bookingRows.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center bg-slate-50">
                                            <CalendarClock className="mx-auto h-8 w-8 text-slate-400" />
                                            <p className="mt-3 text-base font-medium text-slate-800">No bookings yet</p>
                                            <p className="text-sm text-slate-500">Abhi tak koi booking nahi mili.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {bookingRows.map((booking) => (
                                                <BookingCard key={booking._id} booking={booking} />
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : null}

                        {activeTab === "shops" ? (
                            <Card className="rounded-2xl border-0 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                                <CardHeader>
                                    <CardTitle className="text-slate-900 flex items-center gap-2">
                                        <Store className="h-5 w-5 text-emerald-600" />
                                        Nearby Shops
                                    </CardTitle>
                                    <CardDescription>Based on your current location</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Button
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => {
                                            const lat = safeCoord(manualLat || backendLat || userLocation?.latitude || "");
                                            const lng = safeCoord(manualLng || backendLng || userLocation?.longitude || "");
                                            fetchNearby(lat, lng);
                                        }}
                                        disabled={nearbyShopsQuery.isFetching}
                                    >
                                        <Navigation className="h-4 w-4 mr-2" />
                                        {nearbyShopsQuery.isFetching ? "Finding..." : "Find Nearby Shops"}
                                    </Button>

                                    {nearbyShopsQuery.isFetching ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Skeleton className="h-44 w-full rounded-2xl" />
                                            <Skeleton className="h-44 w-full rounded-2xl" />
                                            <Skeleton className="h-44 w-full rounded-2xl" />
                                            <Skeleton className="h-44 w-full rounded-2xl" />
                                        </div>
                                    ) : (nearbyShopsQuery.data || []).length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50">
                                            <MapPin className="mx-auto h-8 w-8 text-slate-400" />
                                            <p className="mt-3 text-sm font-medium text-slate-700">No nearby shops found yet.</p>
                                            <p className="text-xs text-slate-500">Update your location and try again.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {(nearbyShopsQuery.data || []).map((shop) => (
                                                <ShopCard key={shop.id} shop={shop as Shop & { distanceKm?: number }} />
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-xs text-slate-500">
                                        Prefer browsing all stores? <Link className="text-emerald-700 underline" to="/shops">Open shops directory</Link>
                                    </p>
                                </CardContent>
                            </Card>
                        ) : null}

                        {activeTab === "plan" ? (
                            <>
                                <Card className="rounded-2xl border-0 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                                    <CardHeader>
                                        <CardTitle className="text-slate-900">My Plan</CardTitle>
                                        <CardDescription>Manage your current membership and upgrade anytime.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                                            <p className="text-xs uppercase tracking-wide text-emerald-700">Current Plan</p>
                                            <p className="text-2xl font-black text-slate-900 mt-1">{currentPlan.name}</p>
                                            <p className="text-sm text-slate-600 mt-1">
                                                Expiry: {planExpiry ? new Date(planExpiry).toLocaleDateString() : "No expiry"}
                                            </p>
                                            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                                                {currentPlan.features.map((feature) => (
                                                    <li key={feature}>- {feature}</li>
                                                ))}
                                            </ul>
                                            <Button
                                                className="mt-4 bg-[rgb(255,136,0)] hover:bg-[rgb(235,121,0)] text-white"
                                                onClick={() => setPlanModalOpen(true)}
                                            >
                                                Upgrade Plan
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {plans.map((plan) => (
                                                <PlanCard
                                                    key={plan.id}
                                                    plan={plan}
                                                    isCurrent={currentPlanId === plan.id}
                                                    ctaLabel="Upgrade"
                                                    onSelect={() => {
                                                        selectPlan(plan.id);
                                                        toast({
                                                            title: "Plan switched",
                                                            description: `${plan.name} is now your active plan.`,
                                                        });
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <PlanModal open={planModalOpen} onOpenChange={setPlanModalOpen} />
                            </>
                        ) : null}

                        {activeTab === "settings" ? (
                            <Card className="rounded-2xl border-0 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                                <CardHeader>
                                    <CardTitle className="text-slate-900">Settings</CardTitle>
                                    <CardDescription>Manage account preferences and profile fields.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label>Name</Label>
                                            <Input value={displayedUser?.name || ""} disabled />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Email</Label>
                                            <Input value={displayedUser?.email || ""} disabled />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 max-w-sm">
                                        <Label>Phone</Label>
                                        <Input value={displayedUser?.phone || "Not added"} disabled />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Profile Photo</Label>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12 border border-emerald-200">
                                                <AvatarImage src={profileAvatarUrl} alt={displayedUser?.name || "Customer"} />
                                                <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">
                                                    {getInitials(displayedUser?.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <Button
                                                variant="outline"
                                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                onClick={() => avatarInputRef.current?.click()}
                                            >
                                                <Upload className="h-4 w-4 mr-2" /> Upload / Change
                                            </Button>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-500">
                                        Editable settings can be connected to backend profile APIs in the next iteration.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : null}
                    </main>
                </div>
            </div>
        </section>
    );
}