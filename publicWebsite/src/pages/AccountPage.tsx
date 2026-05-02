import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserLocation } from "@/hooks/useUserLocation";
import { loadGoogleMaps } from "@/lib/googleMaps";
import {
    API_BASE_URL,
    fetchMyCustomerReferralSummary,
    fetchMyWalletTransactions,
    fetchMyWithdrawals,
    requestWalletWithdrawal,
    submitPlatformFeedback,
} from "@/lib/publicShopsApi";
import { FacebookIcon, GoogleIcon } from "@/components/auth/BrandIcons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
    ArrowRight,
    CalendarClock,
    Eye,
    Facebook,
    Gift,
    Home,
    LocateFixed,
    Lock,
    LogOut,
    Mail,
    MapPin,
    Navigation,
    Settings,
    Star,
    Upload,
    UserCircle2,
    Wallet
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

type Role = "customer" | "business_owner" | "admin" | "staff";
type DashboardTab = "overview" | "location" | "bookings" | "referrals" | "wallet" | "feedback" | "settings";

type ParsedAddress = {
    area: string;
    city: string;
    state: string;
    fullAddress: string;
};

type LocationSearchResult = {
    id: string;
    label: string;
    lat: number;
    lng: number;
    parsed: ParsedAddress;
};

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

type OrderRow = {
    _id: string;
    orderId?: string;
    status?: string;
    source?: string;
    origin?: string;
    total?: number;
    createdAt?: string;
    business?: { name?: string; slug?: string; whatsapp?: string; phone?: string } | null;
    items?: Array<{ title?: string; quantity?: number }>;
};

type MyBookingsResponse = {
    success: boolean;
    message?: string;
    data?: {
        bookings: BookingRow[];
    };
};

type MyOrdersResponse = {
    success: boolean;
    message?: string;
    data?: {
        orders: OrderRow[];
    };
};

const getToken = () => localStorage.getItem("accessToken");
const AVATAR_CACHE_PREFIX = "publicdukan-avatar-cache:";

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

const statusTone = (status?: string) => {
    const s = String(status || "booked").toLowerCase();
    if (s.includes("cancel")) return "bg-destructive/10 text-destructive border-destructive/20";
    if (s.includes("complete") || s.includes("done")) return "bg-primary/10 text-primary border-primary/20";
    if (s.includes("pending")) return "bg-secondary/10 text-secondary border-secondary/20";
    return "bg-accent/10 text-accent border-accent/20";
};

const getParsedAddress = (address: Record<string, any> | undefined | null): ParsedAddress => {
    const area = String(
        address?.suburb ||
        address?.neighbourhood ||
        address?.city_district ||
        address?.village ||
        address?.hamlet ||
        ""
    ).trim();
    const city = String(address?.city || address?.town || address?.county || "").trim();
    const state = String(address?.state || "").trim();
    const fullAddress = [area, city, state].filter(Boolean).join(", ");
    return {
        area: area || "N/A",
        city: city || "N/A",
        state: state || "N/A",
        fullAddress: fullAddress || "N/A",
    };
};

const searchLocationByText = async (query: string): Promise<LocationSearchResult[]> => {
    const q = String(query || "").trim();
    if (!q) return [];

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(q)}`
    );

    if (!response.ok) {
        throw new Error("Location search unavailable right now");
    }

    const rows = (await response.json()) as Array<any>;
    return (rows || [])
        .map((row) => {
            const lat = Number(row?.lat);
            const lng = Number(row?.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            const parsed = getParsedAddress(row?.address);
            return {
                id: String(row?.place_id || `${lat},${lng}`),
                label: String(row?.display_name || parsed.fullAddress || "Selected location"),
                lat,
                lng,
                parsed,
            } as LocationSearchResult;
        })
        .filter((x): x is LocationSearchResult => !!x);
};

const reverseGeocode = async (lat: number, lng: number): Promise<ParsedAddress> => {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&addressdetails=1`
    );

    if (!response.ok) {
        throw new Error("Unable to resolve address");
    }

    const json = await response.json();
    return getParsedAddress(json?.address);
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
    const { t } = useTranslation();
    const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-";
    const lastLogin = user.updatedAt ? new Date(user.updatedAt).toLocaleString() : t("account.overview.justNow");

    return (
        <Card className="rounded-2xl border border-border/60 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_40%),radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.14),transparent_38%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--background)))] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-6 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-primary/25">
                            <AvatarImage src={user.avatarUrl} alt={user.name || t("account.roles.customer")} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">{user.name || t("account.roles.customer")}</h2>
                            <p className="text-sm text-muted-foreground">{user.email || "-"}</p>
                            <p className="text-sm text-muted-foreground">{user.phone || t("account.overview.phoneNotAdded")}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border border-primary/20">{roleLabel}</Badge>
                        <Badge
                            className={
                                user.isActive === false
                                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                                    : "bg-primary/10 text-primary border border-primary/20"
                            }
                        >
                            {user.isActive === false ? t("account.overview.inactive") : t("account.overview.active")}
                        </Badge>
                        <Badge
                            className={
                                user.isEmailVerified
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "bg-secondary/10 text-secondary border border-secondary/20"
                            }
                        >
                            {user.isEmailVerified ? t("account.overview.verified") : t("account.overview.unverified")}
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="rounded-xl border border-border/60 shadow-none bg-card/70">
                        <CardContent className="p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("account.overview.totalBookings")}</p>
                            <p className="text-2xl font-bold text-foreground">{totalBookings}</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl border border-border/60 shadow-none bg-card/70">
                        <CardContent className="p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("account.overview.lastLogin")}</p>
                            <p className="text-sm font-medium text-foreground">{lastLogin}</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl border border-border/60 shadow-none bg-card/70">
                        <CardContent className="p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("account.overview.locationStatus")}</p>
                            <p className="text-sm font-medium text-foreground">{locationStatus}</p>
                        </CardContent>
                    </Card>
                </div>

                <p className="text-xs text-muted-foreground">{t("account.overview.joinedOn", { date: joined })}</p>
            </CardContent>
        </Card>
    );
}

function BookingCard({ booking }: { booking: BookingRow }) {
    const { t } = useTranslation();
    return (
        <Card className="rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="font-semibold text-foreground">{booking.business?.name || t("account.bookings.fallbackShop")}</p>
                        <p className="text-sm text-muted-foreground">{booking.listing?.title || t("account.bookings.fallbackServiceBooking")}</p>
                    </div>
                    <Badge className={`border ${statusTone(booking.status)}`}>{booking.status || "booked"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    {booking.date ? new Date(booking.date).toLocaleDateString() : t("account.bookings.dateNA")}
                    {booking.startTime ? ` • ${booking.startTime}${booking.endTime ? ` - ${booking.endTime}` : ""}` : ""}
                </p>
            </CardContent>
        </Card>
    );
}

function OrderCard({ order }: { order: OrderRow }) {
    const { t } = useTranslation();

    const shopName = order.business?.name || t("account.orders.fallbackShop");
    const created = order.createdAt ? new Date(order.createdAt).toLocaleString() : "";
    const total = Math.round(Number(order.total || 0) * 100) / 100;
    const itemSummary = (order.items || [])
        .slice(0, 2)
        .map((it) => {
            const title = String(it?.title || '').trim();
            const qty = Number(it?.quantity || 0);
            if (!title) return null;
            return qty > 1 ? `${title} × ${qty}` : title;
        })
        .filter(Boolean)
        .join(", ");

    return (
        <Card className="rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="font-semibold text-foreground">{shopName}</p>
                        <p className="text-sm text-muted-foreground">
                            {order.orderId ? `${t("account.orders.orderIdLabel")}: ${order.orderId}` : t("account.orders.orderLabel")}
                            {created ? ` • ${created}` : ""}
                        </p>
                    </div>
                    <Badge className={`border ${statusTone(order.status)}`}>{order.status || "pending"}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                        {t("account.orders.totalLabel")}: <span className="font-medium text-foreground">₹{total}</span>
                    </span>
                    {itemSummary ? <span>{itemSummary}</span> : null}
                </div>
            </CardContent>
        </Card>
    );
}

function LocationCard({
    locationLoading,
    userLocation,
    permissionDenied,
    area,
    city,
    state,
    locationSearch,
    onLocationSearch,
    onSearchLocation,
    locationSearchLoading,
    searchResults,
    onPickSearchResult,
    onRefresh,
    onUseDevice,
    onSave,
    locationSaveLoading,
    locationCapturedAt,
    mapLat,
    mapLng,
    mapRef,
    hasMapsKey,
}: {
    locationLoading: boolean;
    userLocation: { latitude: number; longitude: number; accuracy?: number } | null;
    permissionDenied: boolean;
    area: string;
    city: string;
    state: string;
    locationSearch: string;
    onLocationSearch: (v: string) => void;
    onSearchLocation: () => void;
    locationSearchLoading: boolean;
    searchResults: LocationSearchResult[];
    onPickSearchResult: (r: LocationSearchResult) => void;
    onRefresh: () => void;
    onUseDevice: () => void;
    onSave: () => void;
    locationSaveLoading: boolean;
    locationCapturedAt: string;
    mapLat: number;
    mapLng: number;
    mapRef: React.RefObject<HTMLDivElement>;
    hasMapsKey: boolean;
}) {
    const { t } = useTranslation();
    return (
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <LocateFixed className="h-5 w-5 text-primary" />
                    {t("account.location.title")}
                </CardTitle>
                <CardDescription>{t("account.location.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="locationSearch">{t("account.location.searchLabel")}</Label>
                    <div className="flex gap-2">
                        <Input
                            id="locationSearch"
                            value={locationSearch}
                            onChange={(e) => onLocationSearch(e.target.value)}
                            placeholder={t("account.location.searchPlaceholder")}
                        />
                        <Button onClick={onSearchLocation} disabled={locationSearchLoading || !locationSearch.trim()} className="bg-primary hover:bg-primary/90">
                            {locationSearchLoading ? t("account.location.searching") : t("account.location.search")}
                        </Button>
                    </div>

                    {searchResults.length > 0 ? (
                        <div className="rounded-xl border border-border bg-muted/40 p-2 space-y-2 max-h-52 overflow-auto">
                            {searchResults.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="w-full text-left rounded-lg border border-border bg-card px-3 py-2 hover:bg-primary/10"
                                    onClick={() => onPickSearchResult(item)}
                                >
                                    <p className="text-sm font-medium text-foreground">{item.parsed.fullAddress}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{item.label}</p>
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-primary font-medium">
                        <span className="relative flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75 animate-ping" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                        </span>
                        {t("account.location.tracking")}
                    </div>
                    <Badge className="bg-card border border-primary/20 text-primary">
                        {locationLoading
                            ? t("account.location.detecting")
                            : userLocation
                                ? t("account.location.live")
                                : permissionDenied
                                    ? t("account.location.permissionDenied")
                                    : t("account.location.idle")}
                    </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border p-3 bg-muted/40">
                        <p className="text-xs uppercase text-muted-foreground">{t("account.location.area")}</p>
                        <p className="text-sm font-semibold text-foreground">{area || "N/A"}</p>
                    </div>
                    <div className="rounded-xl border border-border p-3 bg-muted/40">
                        <p className="text-xs uppercase text-muted-foreground">{t("account.location.city")}</p>
                        <p className="text-sm font-semibold text-foreground">{city || "N/A"}</p>
                    </div>
                    <div className="rounded-xl border border-border p-3 bg-muted/40">
                        <p className="text-xs uppercase text-muted-foreground">{t("account.location.state")}</p>
                        <p className="text-sm font-semibold text-foreground">{state || "N/A"}</p>
                    </div>
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                    {Number.isFinite(mapLat) && Number.isFinite(mapLng) && !hasMapsKey ? (
                        <iframe
                            title="Google Map Preview"
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(`${mapLat},${mapLng}`)}&z=15&output=embed`}
                            className="h-52 w-full border-0"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    ) : (
                        <div ref={mapRef} className="h-52 w-full bg-muted" />
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button onClick={onRefresh} variant="outline" className="border-primary/25 text-primary hover:bg-primary/10">
                        {t("account.location.refresh")}
                    </Button>
                    <Button onClick={onUseDevice} variant="secondary">
                        {t("account.location.useDevice")}
                    </Button>
                    <Button onClick={onSave} disabled={locationSaveLoading} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                        {locationSaveLoading ? t("account.location.saving") : t("account.location.save")}
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground">{t("account.location.lastSynced", { time: locationCapturedAt })}</p>
            </CardContent>
        </Card>
    );
}

export default function AccountPage() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { user: authUser, logout: authLogout, updateUser, socialLogin } = useAuth();
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

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [changePasswordLoading, setChangePasswordLoading] = useState(false);
    const [changePasswordError, setChangePasswordError] = useState("");
    const [changePasswordMessage, setChangePasswordMessage] = useState("");

    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawAccountHolderName, setWithdrawAccountHolderName] = useState("");
    const [withdrawBankName, setWithdrawBankName] = useState("");
    const [withdrawAccountNumber, setWithdrawAccountNumber] = useState("");
    const [withdrawIfsc, setWithdrawIfsc] = useState("");
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [withdrawError, setWithdrawError] = useState("");
    const [withdrawMessage, setWithdrawMessage] = useState("");

    const [platformRating, setPlatformRating] = useState("5");
    const [platformFeedbackText, setPlatformFeedbackText] = useState("");
    const [platformSubmitLoading, setPlatformSubmitLoading] = useState(false);
    const [platformSubmitError, setPlatformSubmitError] = useState("");
    const [platformSubmitMessage, setPlatformSubmitMessage] = useState("");

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [locationSearch, setLocationSearch] = useState("");
    const [locationSearchLoading, setLocationSearchLoading] = useState(false);
    const [locationSearchResults, setLocationSearchResults] = useState<LocationSearchResult[]>([]);
    const [resolvedAddress, setResolvedAddress] = useState<ParsedAddress>({
        area: "N/A",
        city: "N/A",
        state: "N/A",
        fullAddress: "N/A",
    });

    const { userLocation, requestLocation, permissionDenied, loading: locationLoading } = useUserLocation();
    const { toast } = useToast();

    const locationMapRef = useRef<HTMLDivElement | null>(null);
    const locationMapInstanceRef = useRef<any>(null);
    const locationMarkerRef = useRef<any>(null);
    const avatarInputRef = useRef<HTMLInputElement | null>(null);

    const facebookAppId = (import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined)?.trim();
    const mapsKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();

    const submitChangePassword = async () => {
        setChangePasswordError("");
        setChangePasswordMessage("");

        if (!getToken()) {
            setChangePasswordError(t("account.settings.changePassword.errors.loginFirst"));
            return;
        }

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setChangePasswordError(t("account.settings.changePassword.errors.allRequired"));
            return;
        }
        if (newPassword.length < 6) {
            setChangePasswordError(t("account.settings.changePassword.errors.min6"));
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setChangePasswordError(t("account.settings.changePassword.errors.mismatch"));
            return;
        }

        setChangePasswordLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const json = await response.json();
            if (!response.ok || !json?.success) {
                throw new Error(json?.message || "Failed to change password");
            }

            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            setChangePasswordMessage(t("account.settings.changePassword.successMessage"));
            toast({ title: t("account.toasts.passwordChangedTitle"), description: t("account.toasts.passwordChangedDesc") });
        } catch (e: any) {
            setChangePasswordError(e?.message || t("account.settings.changePassword.errors.failed"));
        } finally {
            setChangePasswordLoading(false);
        }
    };

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
        toast({ title: t("account.toasts.welcomeTitle"), description: t("account.toasts.welcomeDesc") });
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
        } else if (tab === "referrals") {
            setActiveTab("referrals");
        } else if (tab === "wallet") {
            setActiveTab("wallet");
        } else if (tab === "feedback") {
            setActiveTab("feedback");
        } else if (tab === "settings") {
            setActiveTab("settings");
        } else if (tab === "overview") {
            setActiveTab("overview");
        }
    }, [location.search]);

    const submitPlatformFeedbackForm = async () => {
        setPlatformSubmitError("");
        setPlatformSubmitMessage("");

        if (!getToken()) {
            setPlatformSubmitError(t("account.feedback.errors.loginFirst"));
            return;
        }

        const rating = Number.parseInt(platformRating, 10);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            setPlatformSubmitError(t("account.feedback.errors.ratingRequired"));
            return;
        }

        setPlatformSubmitLoading(true);
        try {
            await submitPlatformFeedback({
                rating,
                feedback: platformFeedbackText,
                source: 'publicWebsite',
            });
            setPlatformFeedbackText("");
            setPlatformSubmitMessage(t("account.feedback.inline.submitted"));
            toast({
                title: t("account.feedback.toast.submittedTitle"),
                description: t("account.feedback.toast.submittedDesc"),
            });
        } catch (e: any) {
            setPlatformSubmitError(e?.message || t("account.feedback.inline.submitFailed"));
        } finally {
            setPlatformSubmitLoading(false);
        }
    };

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
                setCustomerOnlyNotice(t("account.auth.customerOnlyNotice"));
            }
        } catch {
            // ignore
        }
    }, [t]);

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

    const ordersQuery = useQuery({
        queryKey: ["customer-orders", currentUser?._id || null],
        enabled: !!currentUser && !!getToken(),
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/orders/me?limit=50`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const json = (await response.json()) as MyOrdersResponse;
            if (!response.ok || !json.success) {
                throw new Error(json.message || "Failed to load orders");
            }
            return json.data?.orders || [];
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

    const orderRows = useMemo(() => {
        const raw = ordersQuery.data;
        return Array.isArray(raw) ? raw : [];
    }, [ordersQuery.data]);

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
                throw new Error(t("account.auth.errors.phoneDigits10"));
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await response.json();

            const authData = json?.data;
            if (!response.ok || !json?.success || !authData?.accessToken || !authData?.user) {
                throw new Error(json?.message || t("account.toasts.authFailedTitle"));
            }

            if (authData.user.role !== "customer") {
                throw new Error(t("account.auth.errors.customerOnly"));
            }

            persistSession(authData);
        } catch (e: any) {
            const msg = e?.message || "Auth failed";
            setError(msg);
            toast({ title: t("account.toasts.authFailedTitle"), description: msg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const requestForgotOtp = async () => {
        const emailToUse = (forgotEmail || email).trim();
        setForgotError("");
        setForgotMessage("");

        if (!emailToUse) {
            setForgotError(t("account.auth.errors.emailRequired"));
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
                throw new Error(json?.message || t("account.auth.forgot.toast.sendFailedTitle"));
            }

            setForgotEmail(emailToUse);
            setForgotStep("verify");
            setForgotMessage(t("account.auth.forgot.inline.otpSent"));
            toast({ title: t("account.auth.forgot.toast.otpSentTitle"), description: t("account.auth.forgot.toast.otpSentDesc") });
        } catch (e: any) {
            const msg = e?.message || "Failed to send OTP";
            setForgotError(msg);
            toast({ title: t("account.toasts.failedTitle"), description: msg, variant: "destructive" });
        } finally {
            setForgotLoading(false);
        }
    };

    const resendForgotOtp = async () => {
        setForgotError("");
        setForgotMessage("");

        if (!forgotEmail.trim()) {
            setForgotError(t("account.auth.errors.emailRequired"));
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
                throw new Error(json?.message || t("account.auth.forgot.toast.resendFailedTitle"));
            }

            setForgotMessage(t("account.auth.forgot.inline.otpResent"));
            toast({ title: t("account.auth.forgot.toast.otpResentTitle"), description: t("account.auth.forgot.toast.otpResentDesc") });
        } catch (e: any) {
            const msg = e?.message || "Failed to resend OTP";
            setForgotError(msg);
            toast({ title: t("account.toasts.failedTitle"), description: msg, variant: "destructive" });
        } finally {
            setForgotLoading(false);
        }
    };

    const resetPasswordWithOtp = async () => {
        setForgotError("");
        setForgotMessage("");

        if (!forgotEmail.trim() || !forgotOtp.trim() || forgotNewPassword.length < 6) {
            setForgotError(t("account.auth.forgot.inline.verifyMissing"));
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
                throw new Error(json?.message || t("account.auth.forgot.toast.resetFailedTitle"));
            }

            if (authData?.accessToken && authData?.user?.role === "customer") {
                persistSession(authData);
                setForgotOpen(false);
                setForgotStep("request");
                setForgotOtp("");
                setForgotNewPassword("");
                setForgotMessage("");
                toast({ title: t("account.auth.forgot.toast.resetTitle"), description: t("account.auth.forgot.toast.resetSignedInDesc") });
                return;
            }

            setForgotMessage(t("account.auth.forgot.inline.resetSuccessLogin"));
            setForgotOpen(false);
            setForgotStep("request");
            toast({ title: t("account.auth.forgot.toast.resetTitle"), description: t("account.auth.forgot.toast.resetNowLoginDesc") });
        } catch (e: any) {
            const msg = e?.message || "Failed to reset password";
            setForgotError(msg);
            toast({ title: t("account.auth.forgot.toast.resetFailedTitle"), description: msg, variant: "destructive" });
        } finally {
            setForgotLoading(false);
        }
    };

    const handleGoogleCustomerAuth = async () => {
        setError("");
        setSocialLoading(true);
        try {
            const completed = await socialLogin("google");
            if (!completed) return;
            setCurrentUser(getStoredUser());
            toast({ title: t("account.toasts.successTitle"), description: t("account.auth.social.signedInWith", { provider: "Google" }) });
        } catch (e: any) {
            const msg = e?.message || "Google login failed";
            setError(msg);
            toast({ title: t("account.auth.social.failedGoogleTitle"), description: msg, variant: "destructive" });
        } finally {
            setSocialLoading(false);
        }
    };

    const handleFacebookCustomerAuth = async () => {
        setError("");
        setSocialLoading(true);
        try {
            const completed = await socialLogin("facebook");
            if (!completed) return;
            setCurrentUser(getStoredUser());
            toast({ title: t("account.toasts.successTitle"), description: t("account.auth.social.signedInWith", { provider: "Facebook" }) });
        } catch (e: any) {
            const msg = e?.message || "Facebook login failed";
            setError(msg);
            toast({ title: t("account.auth.social.failedFacebookTitle"), description: msg, variant: "destructive" });
        } finally {
            setSocialLoading(false);
        }
    };

    const logout = () => {
        authLogout();
        setCurrentUser(null);
        toast({ title: t("common.header.signedOutTitle"), description: t("common.header.signedOutDesc") });
    };

    const handleLogoutClick = () => {
        logout();
        navigate("/login");
    };

    const handleAvatarUpload = async (file?: File | null) => {
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast({ title: t("account.profilePhoto.errors.invalidFileTitle"), description: t("account.profilePhoto.errors.invalidFileDesc"), variant: "destructive" });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast({ title: t("account.profilePhoto.errors.tooLargeTitle"), description: t("account.profilePhoto.errors.tooLargeDesc"), variant: "destructive" });
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
            toast({ title: t("account.profilePhoto.toast.updatedTitle"), description: t("account.profilePhoto.toast.updatedDesc") });

        } catch (e: any) {
            toast({ title: t("account.profilePhoto.toast.uploadFailedTitle"), description: e?.message || t("account.profilePhoto.toast.uploadFailedDesc"), variant: "destructive" });
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
            toast({ title: t("account.profilePhoto.toast.removedTitle"), description: t("account.profilePhoto.toast.removedDesc") });
        } catch (e: any) {
            toast({ title: t("account.profilePhoto.toast.removeFailedTitle"), description: e?.message || t("account.profilePhoto.toast.removeFailedDesc"), variant: "destructive" });
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
        : t("account.location.notSyncedYet");

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
            setLocationSaveError(t("account.location.errors.invalidLatitude"));
            toast({ title: t("account.location.errors.invalidLatitudeTitle"), description: t("account.location.errors.invalidLatitudeDesc"), variant: "destructive" });
            return;
        }
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
            setLocationSaveError(t("account.location.errors.invalidLongitude"));
            toast({ title: t("account.location.errors.invalidLongitudeTitle"), description: t("account.location.errors.invalidLongitudeDesc"), variant: "destructive" });
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

            setLocationSaveMessage(t("account.location.inline.saved"));
            toast({ title: t("account.location.toast.updatedTitle"), description: t("account.location.toast.updatedDesc") });
            await meQuery.refetch();
        } catch (e: any) {
            const msg = e?.message || "Location save failed";
            setLocationSaveError(msg);
            toast({ title: t("account.location.toast.saveFailedTitle"), description: msg, variant: "destructive" });
        } finally {
            setLocationSaveLoading(false);
        }
    };

    const refreshLiveLocation = () => {
        requestLocation();
        toast({ title: t("account.location.toast.refreshingTitle"), description: t("account.location.toast.refreshingDesc") });
    };

    const useDeviceLocation = () => {
        if (!userLocation) {
            toast({ title: t("account.location.toast.unavailableTitle"), description: t("account.location.toast.unavailableDesc"), variant: "destructive" });
            return;
        }
        setManualLat(String(userLocation.latitude));
        setManualLng(String(userLocation.longitude));
        setManualAccuracy(Number.isFinite(userLocation.accuracy as number) ? String(userLocation.accuracy) : "");
        toast({ title: t("account.location.toast.deviceAppliedTitle"), description: t("account.location.toast.deviceAppliedDesc") });
    };

    const searchLocation = async () => {
        const query = locationSearch.trim();
        if (!query) {
            setLocationSearchResults([]);
            return;
        }

        setLocationSearchLoading(true);
        try {
            const results = await searchLocationByText(query);
            setLocationSearchResults(results);
            if (results.length === 0) {
                toast({ title: t("account.location.toast.noResultsTitle"), description: t("account.location.toast.noResultsDesc") });
            }
        } catch (e: any) {
            toast({ title: t("account.location.toast.searchFailedTitle"), description: e?.message || t("account.location.toast.searchFailedDesc"), variant: "destructive" });
        } finally {
            setLocationSearchLoading(false);
        }
    };

    const handlePickSearchResult = (item: LocationSearchResult) => {
        setManualLat(String(item.lat));
        setManualLng(String(item.lng));
        setLocationSearch(item.label);
        setResolvedAddress(item.parsed);
        setLocationSearchResults([]);
        toast({ title: t("account.location.toast.selectedTitle"), description: item.parsed.fullAddress || t("account.location.toast.selectedDesc") });
    };

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
        if (!Number.isFinite(mapLat) || !Number.isFinite(mapLng)) return;
        let cancelled = false;
        (async () => {
            try {
                const parsed = await reverseGeocode(mapLat, mapLng);
                if (!cancelled) setResolvedAddress(parsed);
            } catch {
                if (!cancelled) {
                    setResolvedAddress({
                        area: "N/A",
                        city: "N/A",
                        state: "N/A",
                        fullAddress: "N/A",
                    });
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [mapLat, mapLng]);

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
                        title: t("account.location.mapMarkerTitle"),
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
    }, [mapsKey, mapLat, mapLng, t]);

    const locationStatus = Number.isFinite(backendLat) && Number.isFinite(backendLng) ? t("account.location.synced") : t("account.location.notSynced");

    const navItems: Array<{ key: DashboardTab; label: string; icon: typeof Home }> = [
        { key: "overview", label: t("account.nav.overview"), icon: UserCircle2 },
        { key: "location", label: t("account.nav.location"), icon: Navigation },
        { key: "bookings", label: t("account.nav.bookings"), icon: CalendarClock },
        { key: "referrals", label: t("account.nav.referrals"), icon: Gift },
        { key: "wallet", label: t("account.nav.wallet"), icon: Wallet },
        { key: "feedback", label: t("account.nav.feedback"), icon: Star },
        { key: "settings", label: t("account.nav.settings"), icon: Settings },
    ];

    const referralSummaryQuery = useQuery({
        queryKey: ["customer", "referrals", "summary", currentUser?._id],
        queryFn: async () => {
            const d = await fetchMyCustomerReferralSummary();
            return d;
        },
        enabled: !!currentUser && currentUser.role === "customer",
        retry: 1,
    });

    const walletTxnsQuery = useQuery({
        queryKey: ["customer", "wallet", "transactions", currentUser?._id],
        queryFn: async () => {
            const rows = await fetchMyWalletTransactions();
            return rows;
        },
        enabled: !!currentUser && currentUser.role === "customer",
        retry: 1,
    });

    const withdrawalsQuery = useQuery({
        queryKey: ["customer", "wallet", "withdrawals", currentUser?._id],
        queryFn: async () => {
            const rows = await fetchMyWithdrawals();
            return rows;
        },
        enabled: !!currentUser && currentUser.role === "customer",
        retry: 1,
    });

    const submitWithdrawal = async () => {
        try {
            setWithdrawError("");
            setWithdrawMessage("");
            setWithdrawLoading(true);

            const amt = Number(withdrawAmount);
            if (!Number.isFinite(amt) || amt <= 0) {
                setWithdrawError(t("account.wallet.errors.invalidAmount"));
                return;
            }

            await requestWalletWithdrawal({
                amount: amt,
                accountHolderName: withdrawAccountHolderName.trim(),
                bankName: withdrawBankName.trim(),
                accountNumber: withdrawAccountNumber.trim(),
                ifsc: withdrawIfsc.trim().toUpperCase(),
            });

            setWithdrawMessage(t("account.wallet.messages.submitted"));
            setWithdrawAmount("");

            withdrawalsQuery.refetch();
            walletTxnsQuery.refetch();
            referralSummaryQuery.refetch();
        } catch (e: any) {
            setWithdrawError(e?.message || t("account.wallet.errors.requestFailed"));
        } finally {
            setWithdrawLoading(false);
        }
    };

    if (!currentUser) {
        return (
            <section className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_40%),radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.12),transparent_35%),linear-gradient(hsl(var(--background)),hsl(var(--muted)/0.35))] py-8">
                <div className="container">
                    <div className="max-w-2xl mx-auto">
                        <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-3xl font-black tracking-tight text-foreground">
                                    {mode === "register" ? t("auth.signup.titleForm") : t("auth.login.titleLogin")}
                                </CardTitle>
                                <CardDescription>
                                    {mode === "register" ? t("account.auth.panelDescRegister") : t("account.auth.panelDescLogin")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {mode === "register" ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="name">{t("auth.signup.name")}</Label>
                                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("auth.signup.placeholderName")} className="h-12" />
                                    </div>
                                ) : null}

                                {mode === "register" ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">{t("account.auth.fields.mobileNumber")}</Label>
                                        <Input
                                            id="phone"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                                            placeholder={t("auth.signup.placeholderPhone")}
                                            className="h-12"
                                            inputMode="numeric"
                                            maxLength={10}
                                        />
                                    </div>
                                ) : null}

                                <div className="space-y-2">
                                    <Label htmlFor="email">{t("auth.login.email")}</Label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.signup.placeholderEmail")} className="h-12 pl-10" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">{t("auth.login.password")}</Label>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.signup.placeholderPassword")} className="h-12 pl-10 pr-10" />
                                        <Eye className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    </div>
                                </div>

                                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                                {customerOnlyNotice ? <p className="text-sm text-destructive">{customerOnlyNotice}</p> : null}

                                <Button className="w-full h-12 bg-primary hover:bg-primary/90" onClick={submit} disabled={loading || !email || !password || (mode === "register" && (!name || phone.length !== 10))}>
                                    {loading
                                        ? mode === "register"
                                            ? t("auth.signup.creating")
                                            : t("auth.login.loggingIn")
                                        : mode === "register"
                                            ? t("actions.signup")
                                            : t("actions.login")}{" "}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>

                                {mode === "login" ? (
                                    <button
                                        type="button"
                                        className="w-full text-center text-primary font-medium hover:underline"
                                        onClick={() => {
                                            setForgotOpen((prev) => !prev);
                                            setForgotError("");
                                            setForgotMessage("");
                                            if (!forgotEmail && email) setForgotEmail(email);
                                        }}
                                    >
                                        {t("auth.login.forgotPassword")}
                                    </button>
                                ) : null}

                                {mode === "login" && forgotOpen ? (
                                    <div className="rounded-xl border border-border p-3 space-y-3 bg-muted/40">
                                        <p className="text-sm font-medium">{t("auth.login.titleForgot")}</p>
                                        <div className="space-y-2">
                                            <Label htmlFor="forgotEmail">{t("auth.login.email")}</Label>
                                            <Input id="forgotEmail" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder={t("auth.signup.placeholderEmail")} />
                                        </div>

                                        {forgotStep === "verify" ? (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="forgotOtp">{t("auth.login.otp")}</Label>
                                                    <Input id="forgotOtp" value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value)} placeholder={t("auth.validation.otpRequired")} maxLength={6} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="forgotNewPassword">{t("account.settings.changePassword.fields.new")}</Label>
                                                    <Input id="forgotNewPassword" type="password" value={forgotNewPassword} onChange={(e) => setForgotNewPassword(e.target.value)} placeholder={t("auth.signup.placeholderPassword")} />
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button size="sm" onClick={resetPasswordWithOtp} disabled={forgotLoading}>
                                                        {forgotLoading ? t("auth.login.updating") : t("auth.login.resetPassword")}
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={resendForgotOtp} disabled={forgotLoading}>
                                                        {t("auth.login.resendOtp")}
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <Button size="sm" onClick={requestForgotOtp} disabled={forgotLoading}>
                                                {forgotLoading ? t("auth.login.sending") : t("auth.login.sendOtp")}
                                            </Button>
                                        )}

                                        {forgotError ? <p className="text-xs text-destructive">{forgotError}</p> : null}
                                        {forgotMessage ? <p className="text-xs text-primary">{forgotMessage}</p> : null}
                                    </div>
                                ) : null}

                                <div className="relative text-center text-xs tracking-wide text-muted-foreground py-2">
                                    <span className="px-3 bg-card relative z-10">{t("auth.login.orContinueWith")}</span>
                                    <span className="absolute left-0 right-0 top-1/2 border-t -z-0" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Button variant="outline" className="h-11" onClick={handleGoogleCustomerAuth} disabled={socialLoading}>
                                        <GoogleIcon className="w-4 h-4 mr-2" /> {socialLoading ? t("account.common.connecting") : "Google"}
                                    </Button>
                                    <Button variant="outline" className="h-11" onClick={handleFacebookCustomerAuth} disabled={socialLoading}>
                                        <FacebookIcon className="w-4 h-4 mr-2 text-primary" /> {socialLoading ? t("account.common.connecting") : "Facebook"}
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
                                    {mode === "register"
                                        ? `${t("auth.signup.alreadyHave")} ${t("auth.signup.login")}`
                                        : `${t("auth.login.newTo")} ${t("auth.login.createAccount")}`}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.10),transparent_35%),radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.10),transparent_30%),linear-gradient(hsl(var(--background)),hsl(var(--muted)/0.30))] py-6 md:py-8">
            <div className="container">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px,1fr]">
                    <aside className="hidden lg:block lg:sticky lg:top-24 h-fit">
                        <Card className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur shadow-sm">
                            <CardContent className="p-5 space-y-5">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12 border border-primary/25">
                                        <AvatarImage src={profileAvatarUrl} alt={displayedUser?.name || t("account.roles.customer")} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                            {getInitials(displayedUser?.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-foreground truncate">{displayedUser?.name || t("account.roles.customer")}</p>
                                        <p className="text-xs text-muted-foreground truncate">{displayedUser?.email || "-"}</p>
                                    </div>
                                </div>

                                <Badge className="bg-primary/10 text-primary border border-primary/20 w-fit">{t("account.roles.customer")}</Badge>

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
                                                    ? "bg-primary/10 text-primary border border-primary/20"
                                                    : "text-muted-foreground border border-transparent hover:bg-muted/40"
                                                    }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                <span className="text-sm font-medium">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </nav>

                                <Button variant="outline" className="w-full mt-3 border-secondary/25 text-secondary hover:bg-secondary/10" onClick={logout}>
                                    <LogOut className="h-4 w-4 mr-2" />
                                    {t("account.settings.logout.action")}
                                </Button>
                            </CardContent>
                        </Card>
                    </aside>

                    <main className="space-y-6 animate-in fade-in-50 duration-500">
                        {activeTab === "overview" ? (
                            <>
                                {displayedUser ? (
                                    <>
                                        <ProfileCard
                                            user={displayedUser}
                                            roleLabel={t("account.roles.customer")}
                                            totalBookings={bookingRows.length}
                                            locationStatus={locationStatus}
                                        />

                                        <Card className="rounded-2xl border border-border bg-card shadow-sm">
                                            <CardHeader>
                                                <CardTitle className="text-foreground">{t("account.nav.overview")}</CardTitle>
                                                <CardDescription>{displayedUser?.email || "-"}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                <div className="rounded-xl border border-border p-4 bg-muted/40">
                                                    <p className="text-xs text-muted-foreground">{t("account.profile.labels.userId")}</p>
                                                    <p className="font-medium text-foreground break-all">{displayedUser?._id || "-"}</p>
                                                </div>
                                                <div className="rounded-xl border border-border p-4 bg-muted/40">
                                                    <p className="text-xs text-muted-foreground">{t("account.profile.labels.emailVerified")}</p>
                                                    <p className="font-medium text-foreground">
                                                        {displayedUser?.isEmailVerified ? t("account.common.yes") : t("account.common.no")}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                <Card className="rounded-2xl border border-border bg-card shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-foreground">{t("account.profilePhoto.sectionTitle")}</CardTitle>
                                        <CardDescription>{t("account.profilePhoto.sectionDesc")}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <Avatar className="h-20 w-20 border-2 border-primary/25">
                                            <AvatarImage src={profileAvatarUrl} alt={displayedUser?.name || t("account.roles.customer")} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
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
                                                className="border-primary/25 text-primary hover:bg-primary/10"
                                                onClick={() => avatarInputRef.current?.click()}
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                {displayedUser?.avatarUrl
                                                    ? t("account.profilePhoto.actions.changePhoto")
                                                    : t("account.profilePhoto.actions.uploadPhoto")}
                                            </Button>
                                            {displayedUser?.avatarUrl ? (
                                                <Button variant="outline" className="border-border" onClick={removeAvatar}>
                                                    {t("account.profilePhoto.actions.remove")}
                                                </Button>
                                            ) : null}
                                        </div>
                                    </CardContent>
                                </Card>
                                    </>
                                ) : (
                                    <Card className="rounded-2xl border border-border bg-card shadow-sm">
                                        <CardContent className="p-6 space-y-3">
                                            <Skeleton className="h-6 w-56" />
                                            <Skeleton className="h-5 w-72" />
                                            <Skeleton className="h-28 w-full rounded-2xl" />
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        ) : null}

                        {activeTab === "location" ? (
                            <>
                                <LocationCard
                                    locationLoading={locationLoading}
                                    userLocation={userLocation}
                                    permissionDenied={permissionDenied}
                                    area={resolvedAddress.area}
                                    city={resolvedAddress.city}
                                    state={resolvedAddress.state}
                                    locationSearch={locationSearch}
                                    onLocationSearch={setLocationSearch}
                                    onSearchLocation={searchLocation}
                                    locationSearchLoading={locationSearchLoading}
                                    searchResults={locationSearchResults}
                                    onPickSearchResult={handlePickSearchResult}
                                    onRefresh={refreshLiveLocation}
                                    onUseDevice={useDeviceLocation}
                                    onSave={saveLocationManually}
                                    locationSaveLoading={locationSaveLoading}
                                    locationCapturedAt={locationCapturedAt}
                                    mapLat={mapLat}
                                    mapLng={mapLng}
                                    mapRef={locationMapRef}
                                    hasMapsKey={!!mapsKey}
                                />

                                {locationSaveError ? (
                                    <Card className="rounded-xl border border-destructive/30 bg-destructive/10">
                                        <CardContent className="p-3 text-sm text-destructive">{locationSaveError}</CardContent>
                                    </Card>
                                ) : null}

                                {locationSaveMessage ? (
                                    <Card className="rounded-xl border border-primary/20 bg-primary/10">
                                        <CardContent className="p-3 text-sm text-primary">{locationSaveMessage}</CardContent>
                                    </Card>
                                ) : null}
                            </>
                        ) : null}

                        {activeTab === "bookings" ? (
                            <Card className="rounded-2xl border border-border bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-foreground">{t("account.bookings.title")}</CardTitle>
                                    <CardDescription>{t("account.bookings.desc")}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {bookingsQuery.isLoading || ordersQuery.isLoading ? (
                                        <div className="space-y-3">
                                            <Skeleton className="h-28 w-full rounded-2xl" />
                                            <Skeleton className="h-28 w-full rounded-2xl" />
                                            <Skeleton className="h-28 w-full rounded-2xl" />
                                        </div>
                                    ) : bookingRows.length === 0 && orderRows.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border p-10 text-center bg-muted/40">
                                            <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
                                            <p className="mt-3 text-base font-medium text-foreground">{t("account.bookings.emptyTitle")}</p>
                                            <p className="text-sm text-muted-foreground">{t("account.bookings.emptyDesc")}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                {bookingRows.length ? (
                                                    bookingRows.map((booking) => <BookingCard key={booking._id} booking={booking} />)
                                                ) : (
                                                    <div className="rounded-2xl border border-dashed border-border p-6 text-center bg-muted/40">
                                                        <p className="text-sm text-muted-foreground">{t("account.bookings.emptyTitle")}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="h-px w-full bg-border" />

                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-base font-semibold text-foreground">{t("account.orders.title")}</p>
                                                    <p className="text-sm text-muted-foreground">{t("account.orders.desc")}</p>
                                                </div>

                                                {orderRows.length ? (
                                                    <div className="space-y-4">
                                                        {orderRows.map((order) => (
                                                            <OrderCard key={order._id} order={order} />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="rounded-2xl border border-dashed border-border p-6 text-center bg-muted/40">
                                                        <p className="text-sm font-medium text-foreground">{t("account.orders.emptyTitle")}</p>
                                                        <p className="text-sm text-muted-foreground">{t("account.orders.emptyDesc")}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : null}

                        {activeTab === "referrals" ? (
                            <Card className="rounded-2xl border border-border bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-foreground">{t("account.referrals.title")}</CardTitle>
                                    <CardDescription>{t("account.referrals.desc")}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    {referralSummaryQuery.isLoading ? (
                                        <div className="space-y-3">
                                            <Skeleton className="h-10 w-full rounded-xl" />
                                            <Skeleton className="h-24 w-full rounded-2xl" />
                                        </div>
                                    ) : referralSummaryQuery.isError ? (
                                        <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground bg-muted/40">
                                            {t("account.referrals.errors.summaryLoad")}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                                                <p className="text-xs text-primary font-medium">{t("account.referrals.yourCode")}</p>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <div className="px-3 py-2 rounded-xl bg-card border border-primary/20 font-mono text-sm text-primary">
                                                        {referralSummaryQuery.data?.referralCode || "—"}
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        className="border-primary/25 text-primary hover:bg-primary/10"
                                                        onClick={async () => {
                                                            const code = referralSummaryQuery.data?.referralCode || "";
                                                            if (!code) return;
                                                            try {
                                                                await navigator.clipboard.writeText(code);
                                                                toast({ title: t("account.referrals.toast.copiedTitle"), description: t("account.referrals.toast.copiedDesc") });
                                                            } catch {
                                                                toast({ title: t("account.referrals.toast.copyFailedTitle"), description: t("account.referrals.toast.copyFailedDesc") });
                                                            }
                                                        }}
                                                    >
                                                        {t("account.referrals.copy")}
                                                    </Button>
                                                </div>
                                                <p className="mt-2 text-xs text-primary">{t("account.referrals.tip")}</p>
                                                <p className="mt-1 text-xs text-primary">
                                                    <Link to="/referral-program" className="font-medium underline underline-offset-4">
                                                        {t("account.referrals.learnMore")}
                                                    </Link>
                                                </p>
                                                {referralSummaryQuery.data?.activeOffer?.commissionPercent ? (
                                                    <p className="mt-1 text-xs text-primary">
                                                        {t("account.referrals.activeOffer", {
                                                            offerName: referralSummaryQuery.data.activeOffer.offerName,
                                                            percent: Math.round(Number(referralSummaryQuery.data.activeOffer.commissionPercent || 0) * 100) / 100,
                                                        })}
                                                    </p>
                                                ) : null}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="rounded-2xl border border-border p-4 bg-muted/40">
                                                    <p className="text-xs text-muted-foreground">{t("account.referrals.stats.totalReferrals")}</p>
                                                    <p className="text-2xl font-bold text-foreground">{referralSummaryQuery.data?.totalReferrals ?? 0}</p>
                                                </div>
                                                <div className="rounded-2xl border border-border p-4 bg-muted/40">
                                                    <p className="text-xs text-muted-foreground">{t("account.referrals.stats.totalEarnings")}</p>
                                                    <p className="text-2xl font-bold text-foreground">₹{Math.round((referralSummaryQuery.data?.totalEarnings || 0) * 100) / 100}</p>
                                                </div>
                                                <div className="rounded-2xl border border-border p-4 bg-muted/40">
                                                    <p className="text-xs text-muted-foreground">{t("account.referrals.stats.walletBalance")}</p>
                                                    <p className="text-2xl font-bold text-foreground">₹{Math.round((referralSummaryQuery.data?.walletBalance || 0) * 100) / 100}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-sm font-semibold text-foreground">{t("account.referrals.recentTitle")}</p>
                                                {(referralSummaryQuery.data?.recentReferrals || []).length === 0 ? (
                                                    <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-muted/40 text-sm text-muted-foreground">
                                                        {t("account.referrals.emptyRecent")}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {(referralSummaryQuery.data?.recentReferrals || []).slice(0, 10).map((r: any) => (
                                                            <div key={r._id} className="rounded-2xl border border-border p-4 bg-card">
                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                    <div>
                                                                        <p className="text-sm font-medium text-foreground">
                                                                            {r.referredUser?.name || r.referredUser?.email || t("account.referrals.fallbackReferredUser")}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}</p>
                                                                    </div>
                                                                    <Badge
                                                                        className={
                                                                            r.status === "rewarded"
                                                                                ? "bg-primary/10 text-primary border border-primary/20"
                                                                                : "bg-muted text-muted-foreground border border-border"
                                                                        }
                                                                    >
                                                                        {r.status}
                                                                    </Badge>
                                                                </div>
                                                                {r.status === "rewarded" ? (
                                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                                        {t("account.referrals.earned", { amount: Math.round((r.commissionEarned || 0) * 100) / 100 })}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        ) : null}

                        {activeTab === "wallet" ? (
                            <Card className="rounded-2xl border border-border bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-foreground">{t("account.wallet.title")}</CardTitle>
                                    <CardDescription>{t("account.wallet.desc")}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="rounded-2xl border border-border p-4 bg-muted/40">
                                        <p className="text-xs text-muted-foreground">{t("account.wallet.currentBalance")}</p>
                                        <p className="text-2xl font-bold text-foreground">₹{Math.round((referralSummaryQuery.data?.walletBalance || 0) * 100) / 100}</p>
                                    </div>

                                    <div className="rounded-2xl border border-border p-4 bg-card space-y-3">
                                        <p className="text-sm font-semibold text-foreground">{t("account.wallet.requestTitle")}</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label>{t("account.wallet.form.amount")}</Label>
                                                <Input
                                                    value={withdrawAmount}
                                                    onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                                                    placeholder={t("account.wallet.placeholders.amount")}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>{t("account.wallet.form.accountHolderName")}</Label>
                                                <Input
                                                    value={withdrawAccountHolderName}
                                                    onChange={(e) => setWithdrawAccountHolderName(e.target.value)}
                                                    placeholder={t("account.wallet.placeholders.accountHolderName")}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>{t("account.wallet.form.bankName")}</Label>
                                                <Input
                                                    value={withdrawBankName}
                                                    onChange={(e) => setWithdrawBankName(e.target.value)}
                                                    placeholder={t("account.wallet.placeholders.bankName")}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>{t("account.wallet.form.accountNumber")}</Label>
                                                <Input
                                                    value={withdrawAccountNumber}
                                                    onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                                                    placeholder={t("account.wallet.placeholders.accountNumber")}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>{t("account.wallet.form.ifsc")}</Label>
                                                <Input
                                                    value={withdrawIfsc}
                                                    onChange={(e) => setWithdrawIfsc(e.target.value)}
                                                    placeholder={t("account.wallet.placeholders.ifsc")}
                                                />
                                            </div>
                                        </div>

                                        {withdrawError ? <p className="text-sm text-destructive">{withdrawError}</p> : null}
                                        {withdrawMessage ? <p className="text-sm text-primary">{withdrawMessage}</p> : null}

                                        <Button onClick={submitWithdrawal} disabled={withdrawLoading} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                                            {withdrawLoading ? t("account.wallet.actions.pleaseWait") : t("account.wallet.actions.request")}
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-sm font-semibold text-foreground">{t("account.wallet.sections.withdrawalRequestsTitle")}</p>
                                        {withdrawalsQuery.isLoading ? (
                                            <div className="space-y-2">
                                                <Skeleton className="h-16 w-full rounded-2xl" />
                                                <Skeleton className="h-16 w-full rounded-2xl" />
                                            </div>
                                        ) : (withdrawalsQuery.data || []).length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-muted/40 text-sm text-muted-foreground">
                                                {t("account.wallet.sections.noWithdrawalsYet")}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {(withdrawalsQuery.data || []).slice(0, 10).map((w: any) => (
                                                    <div key={w._id} className="rounded-2xl border border-border p-4 bg-card">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <p className="text-sm font-medium text-foreground">₹{Math.round((w.amount || 0) * 100) / 100}</p>
                                                                <p className="text-xs text-muted-foreground">{w.createdAt ? new Date(w.createdAt).toLocaleDateString("en-IN") : "—"}</p>
                                                            </div>
                                                            <Badge
                                                                className={
                                                                    w.status === "approved"
                                                                        ? "bg-primary/10 text-primary border border-primary/20"
                                                                        : w.status === "rejected"
                                                                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                                                                            : "bg-muted text-muted-foreground border border-border"
                                                                }
                                                            >
                                                                {w.status}
                                                            </Badge>
                                                        </div>
                                                        {w.rejectionReason ? (
                                                            <p className="mt-2 text-xs text-destructive">
                                                                {t("account.wallet.reasonLabel")} {w.rejectionReason}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-sm font-semibold text-foreground">{t("account.wallet.sections.recentTransactionsTitle")}</p>
                                        {walletTxnsQuery.isLoading ? (
                                            <div className="space-y-2">
                                                <Skeleton className="h-16 w-full rounded-2xl" />
                                                <Skeleton className="h-16 w-full rounded-2xl" />
                                            </div>
                                        ) : (walletTxnsQuery.data || []).length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-muted/40 text-sm text-muted-foreground">
                                                {t("account.wallet.sections.noTransactionsYet")}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {(walletTxnsQuery.data || []).slice(0, 10).map((t: any) => (
                                                    <div key={t._id} className="rounded-2xl border border-border p-4 bg-card">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <p className="text-sm font-medium text-foreground">
                                                                    {t.type === "credit" ? "+" : "-"}₹{Math.round((t.amount || 0) * 100) / 100} • {t.source}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">{t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-IN") : "—"}</p>
                                                            </div>
                                                            <Badge
                                                                className={
                                                                    t.status === "completed"
                                                                        ? "bg-primary/10 text-primary border border-primary/20"
                                                                        : t.status === "rejected"
                                                                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                                                                            : "bg-muted text-muted-foreground border border-border"
                                                                }
                                                            >
                                                                {t.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}

                        {activeTab === "feedback" ? (
                            <Card className="rounded-2xl border border-border bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-foreground">{t("account.feedback.title")}</CardTitle>
                                    <CardDescription>
                                        {t("account.feedback.desc")}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-2 max-w-sm">
                                        <Label>{t("account.feedback.form.rating")}</Label>
                                        <select
                                            value={platformRating}
                                            onChange={(e) => setPlatformRating(e.target.value)}
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                        >
                                            <option value="5">{t("account.feedback.form.option5")}</option>
                                            <option value="4">{t("account.feedback.form.option4")}</option>
                                            <option value="3">{t("account.feedback.form.option3")}</option>
                                            <option value="2">{t("account.feedback.form.option2")}</option>
                                            <option value="1">{t("account.feedback.form.option1")}</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t("account.feedback.form.textLabel")}</Label>
                                        <Textarea
                                            value={platformFeedbackText}
                                            onChange={(e) => setPlatformFeedbackText(e.target.value)}
                                            placeholder={t("account.feedback.form.textPlaceholder")}
                                            maxLength={2000}
                                        />
                                        <p className="text-xs text-muted-foreground">{t("account.feedback.form.maxChars", { count: 2000 })}</p>
                                    </div>

                                    {platformSubmitError ? <p className="text-sm text-destructive">{platformSubmitError}</p> : null}
                                    {platformSubmitMessage ? <p className="text-sm text-primary">{platformSubmitMessage}</p> : null}

                                    <Button onClick={submitPlatformFeedbackForm} disabled={platformSubmitLoading} className="bg-primary hover:bg-primary/90">
                                        {platformSubmitLoading ? t("account.feedback.actions.submitting") : t("account.feedback.actions.submit")}
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : null}

                        {activeTab === "settings" ? (
                            <Card className="rounded-2xl border border-border bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-foreground">{t("account.settings.title")}</CardTitle>
                                    <CardDescription>{t("account.settings.desc")}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label>{t("account.settings.fields.name")}</Label>
                                            <Input value={displayedUser?.name || ""} disabled />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>{t("account.settings.fields.email")}</Label>
                                            <Input value={displayedUser?.email || ""} disabled />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 max-w-sm">
                                        <Label>{t("account.settings.fields.phone")}</Label>
                                        <Input value={displayedUser?.phone || t("account.settings.fields.phoneNotAdded")} disabled />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t("account.settings.profilePhoto.label")}</Label>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12 border border-primary/25">
                                                <AvatarImage src={profileAvatarUrl} alt={displayedUser?.name || t("account.roles.customer")} />
                                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                    {getInitials(displayedUser?.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <Button
                                                variant="outline"
                                                className="border-primary/25 text-primary hover:bg-primary/10"
                                                onClick={() => avatarInputRef.current?.click()}
                                            >
                                                <Upload className="h-4 w-4 mr-2" /> {t("account.settings.profilePhoto.uploadChange")}
                                            </Button>
                                        </div>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        {t("account.settings.note")}
                                    </p>

                                    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                                        <p className="text-sm font-semibold text-foreground">{t("account.settings.changePassword.title")}</p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label>{t("account.settings.changePassword.fields.current")}</Label>
                                                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t("account.settings.changePassword.placeholders.current")} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>{t("account.settings.changePassword.fields.new")}</Label>
                                                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("account.settings.changePassword.placeholders.new")} />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 max-w-sm">
                                            <Label>{t("account.settings.changePassword.fields.confirm")}</Label>
                                            <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder={t("account.settings.changePassword.placeholders.confirm")} />
                                        </div>

                                        {changePasswordError ? <p className="text-xs text-destructive">{changePasswordError}</p> : null}
                                        {changePasswordMessage ? <p className="text-xs text-primary">{changePasswordMessage}</p> : null}

                                        <Button
                                            onClick={submitChangePassword}
                                            disabled={changePasswordLoading}
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                        >
                                            {changePasswordLoading
                                                ? t("account.settings.changePassword.actions.updating")
                                                : t("account.settings.changePassword.actions.change")}
                                        </Button>
                                    </div>

                                    <div className="rounded-2xl border border-border bg-muted/40 p-4">
                                        <p className="text-sm font-semibold text-foreground">{t("account.settings.help.title")}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t("account.settings.help.desc")}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Button asChild variant="outline" className="border-primary/25 text-primary hover:bg-primary/10">
                                                <Link to="/contact">{t("account.settings.help.contactSupport")}</Link>
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                                        <p className="text-sm font-semibold text-foreground">{t("account.settings.logout.title")}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t("account.settings.logout.desc")}
                                        </p>
                                        <div className="mt-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                                onClick={handleLogoutClick}
                                            >
                                                <LogOut className="h-4 w-4 mr-2" />
                                                {t("account.settings.logout.action")}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}
                    </main>
                </div>
            </div>
        </section>
    );
}