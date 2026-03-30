import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Facebook, Mail, Lock, Eye, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL } from "@/lib/publicShopsApi";
import { useUserLocation } from "@/hooks/useUserLocation";

type Role = "customer" | "business_owner" | "admin" | "staff";

type AuthUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
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
const getStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed?.role !== "customer") return null;
    return parsed;
  } catch {
    return null;
  }
};

export default function AccountPage() {
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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredUser());
  const [customerOnlyNotice, setCustomerOnlyNotice] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualAccuracy, setManualAccuracy] = useState("");
  const [locationSaveLoading, setLocationSaveLoading] = useState(false);
  const [locationSaveError, setLocationSaveError] = useState("");
  const [locationSaveMessage, setLocationSaveMessage] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { userLocation, requestLocation, permissionDenied, loading: locationLoading } = useUserLocation();

  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  const facebookAppId = (import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined)?.trim();

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
    localStorage.setItem("accessToken", authData.accessToken);
    localStorage.setItem("refreshToken", authData.refreshToken || "");
    localStorage.setItem("user", JSON.stringify(authData.user));
    setCurrentUser(authData.user as AuthUser);
    setPassword("");
  };

  useEffect(() => {
    const handler = () => setCurrentUser(getStoredUser());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

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
      const user = json?.data as AuthUser | undefined;
      if (!response.ok || !json?.success || !user) {
        throw new Error(json?.message || "Failed to load profile");
      }
      if (user.role !== "customer") {
        throw new Error("Only customer profile is allowed");
      }
      return user;
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
      setError(e?.message || "Auth failed");
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
    } catch (e: any) {
      setForgotError(e?.message || "Failed to send OTP");
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
    } catch (e: any) {
      setForgotError(e?.message || "Failed to resend OTP");
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
        return;
      }

      setForgotMessage("Password reset successful. Ab login karo.");
      setForgotOpen(false);
      setForgotStep("request");
    } catch (e: any) {
      setForgotError(e?.message || "Failed to reset password");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleCustomerAuth = async () => {
    setError("");

    if (!googleClientId) {
      setError("Google login abhi configure nahi hai (VITE_GOOGLE_CLIENT_ID missing).");
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
      setError(e?.message || "Google login failed");
    } finally {
      setSocialLoading(false);
    }
  };

  const handleFacebookCustomerAuth = async () => {
    setError("");

    if (!facebookAppId) {
      setError("Facebook login abhi configure nahi hai (VITE_FACEBOOK_APP_ID missing).");
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
      setError(e?.message || "Facebook login failed");
    } finally {
      setSocialLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setCurrentUser(null);
  };

  const bookingRows = bookingsQuery.data || [];
  const displayedUser = meQuery.data || currentUser;

  const roleLabel = useMemo(() => {
    if (!displayedUser?.role) return "Guest";
    if (displayedUser.role === "business_owner") return "Business Owner";
    return "Customer";
  }, [displayedUser?.role]);

  const backendLocation = displayedUser?.currentLocation?.coordinates;
  const backendLat = Array.isArray(backendLocation) ? Number(backendLocation[1]) : NaN;
  const backendLng = Array.isArray(backendLocation) ? Number(backendLocation[0]) : NaN;

  const formatCoord = (value: number) => (Number.isFinite(value) ? value.toFixed(6) : "N/A");

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
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setLocationSaveError("Longitude valid hona chahiye (-180 to 180)");
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
      meQuery.refetch();
    } catch (e: any) {
      setLocationSaveError(e?.message || "Location save failed");
    } finally {
      setLocationSaveLoading(false);
    }
  };

  return (
    <section className="container py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Account</h1>
          <p className="text-muted-foreground">Customer auth, profile details aur bookings yahi dikhengi.</p>
        </div>

        {!currentUser ? (
          <Card className="rounded-3xl border bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-3xl font-extrabold tracking-tight">{mode === "register" ? "Create Account" : "Welcome Back"}</CardTitle>
              <p className="text-muted-foreground">{mode === "register" ? "Signup as customer and start booking nearby services" : "Login as customer to continue"}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === "register" ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <div className="relative">
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" className="h-14 pl-4" />
                  </div>
                </div>
              ) : null}

              {mode === "register" ? (
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      className="h-14 pl-4"
                      inputMode="numeric"
                      maxLength={10}
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="h-14 pl-12" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="h-14 pl-12 pr-12" />
                  <Eye className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {customerOnlyNotice ? <p className="text-sm text-destructive">{customerOnlyNotice}</p> : null}

              <div className="space-y-3">
                <Button className="w-full h-14 text-base font-semibold" onClick={submit} disabled={loading || !email || !password || (mode === "register" && (!name || phone.length !== 10))}>
                  {loading ? "Please wait..." : mode === "register" ? "Sign Up" : "Login"} <ArrowRight className="w-5 h-5 ml-2" />
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
                    Forgot password?
                  </button>
                ) : null}

                {mode === "login" && forgotOpen ? (
                  <div className="rounded-xl border p-3 space-y-3 bg-muted/20">
                    <p className="text-sm font-medium">Reset Password via OTP</p>
                    <div className="space-y-2">
                      <Label htmlFor="forgotEmail">Email</Label>
                      <Input
                        id="forgotEmail"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="your@email.com"
                      />
                    </div>

                    {forgotStep === "verify" ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="forgotOtp">OTP</Label>
                          <Input
                            id="forgotOtp"
                            value={forgotOtp}
                            onChange={(e) => setForgotOtp(e.target.value)}
                            placeholder="6 digit OTP"
                            maxLength={6}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="forgotNewPassword">New Password</Label>
                          <Input
                            id="forgotNewPassword"
                            type="password"
                            value={forgotNewPassword}
                            onChange={(e) => setForgotNewPassword(e.target.value)}
                            placeholder="New password"
                          />
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
                    {forgotMessage ? <p className="text-xs text-primary">{forgotMessage}</p> : null}
                  </div>
                ) : null}

                <div className="relative text-center text-xs tracking-wide text-muted-foreground py-2">
                  <span className="px-3 bg-card relative z-10">OR CONTINUE WITH</span>
                  <span className="absolute left-0 right-0 top-1/2 border-t -z-0" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button variant="outline" className="h-12" onClick={handleGoogleCustomerAuth} disabled={socialLoading}>
                    <span className="text-base mr-2">G</span> {socialLoading ? "Connecting..." : "Google"}
                  </Button>
                  <Button variant="outline" className="h-12" onClick={handleFacebookCustomerAuth} disabled={socialLoading}>
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
              </div>

              <p className="text-xs text-muted-foreground">
                Social auth endpoints: /auth/social/google/customer and /auth/social/facebook/customer.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="rounded-2xl border bg-card/95 shadow-sm">
              <CardHeader>
                <CardTitle>Profile Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {meQuery.isLoading ? <Skeleton className="h-5 w-48" /> : <p className="font-semibold">{displayedUser?.name || "-"}</p>}
                <p className="text-sm text-muted-foreground">{displayedUser?.email || "-"}</p>
                {displayedUser?.phone ? <p className="text-sm text-muted-foreground">{displayedUser.phone}</p> : null}
                <Badge variant="secondary">{roleLabel}</Badge>
                <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                  <p>User ID: {displayedUser?._id || "-"}</p>
                  <p>Email verified: {displayedUser?.isEmailVerified ? "Yes" : "No"}</p>
                  <p>Status: {displayedUser?.isActive === false ? "Inactive" : "Active"}</p>
                  <p>Joined: {displayedUser?.createdAt ? new Date(displayedUser.createdAt).toLocaleDateString() : "-"}</p>
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Location: {formatCoord(backendLat)}, {formatCoord(backendLng)}
                  </p>
                </div>
                <div className="pt-2">
                  <Button variant="outline" onClick={logout}>Sign Out</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border bg-card/95 shadow-sm">
              <CardHeader>
                <CardTitle>Live Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Device location: {locationLoading ? "Detecting..." : userLocation ? "Detected" : permissionDenied ? "Permission denied" : "Not available"}
                </p>
                {userLocation ? (
                  <p className="text-muted-foreground">
                    Device coords: {formatCoord(userLocation.latitude)}, {formatCoord(userLocation.longitude)}
                  </p>
                ) : null}
                <p className="text-muted-foreground">
                  Profile coords: {formatCoord(backendLat)}, {formatCoord(backendLng)}
                </p>
                <p className="text-muted-foreground">
                  Accuracy: {Number.isFinite(displayedUser?.currentLocation?.accuracy as number)
                    ? `${Number(displayedUser?.currentLocation?.accuracy).toFixed(0)} m`
                    : "N/A"}
                </p>
                <p className="text-muted-foreground">Last synced: {locationCapturedAt}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="manualLat">Latitude</Label>
                    <Input
                      id="manualLat"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      placeholder="28.6139"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="manualLng">Longitude</Label>
                    <Input
                      id="manualLng"
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      placeholder="77.2090"
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="manualAccuracy">Accuracy (optional, meter)</Label>
                  <Input
                    id="manualAccuracy"
                    value={manualAccuracy}
                    onChange={(e) => setManualAccuracy(e.target.value)}
                    placeholder="25"
                    inputMode="decimal"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => requestLocation()}
                  >
                    Refresh Live Location
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (!userLocation) return;
                      setManualLat(String(userLocation.latitude));
                      setManualLng(String(userLocation.longitude));
                      setManualAccuracy(
                        Number.isFinite(userLocation.accuracy as number)
                          ? String(userLocation.accuracy)
                          : ""
                      );
                    }}
                    disabled={!userLocation}
                  >
                    Use Device Coords
                  </Button>
                  <Button size="sm" onClick={saveLocationManually} disabled={locationSaveLoading}>
                    {locationSaveLoading ? "Saving..." : "Save To Profile"}
                  </Button>
                </div>

                {locationSaveError ? <p className="text-xs text-destructive">{locationSaveError}</p> : null}
                {locationSaveMessage ? <p className="text-xs text-primary">{locationSaveMessage}</p> : null}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border bg-card/95 shadow-sm">
              <CardHeader>
                <CardTitle>My Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {bookingsQuery.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : bookingRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Abhi tak koi booking nahi mili.</p>
                ) : (
                  <div className="space-y-3">
                    {bookingRows.map((b) => (
                      <div key={b._id} className="rounded-lg border p-3">
                        <p className="font-medium">{b.business?.name || "Shop"}</p>
                        <p className="text-sm text-muted-foreground">{b.listing?.title || "Service booking"}</p>
                        <p className="text-sm text-muted-foreground">
                          {b.date ? new Date(b.date).toLocaleDateString() : "Date N/A"} {b.startTime ? `• ${b.startTime}-${b.endTime || ""}` : ""}
                        </p>
                        <Badge className="mt-2" variant="outline">{b.status || "booked"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">
              Nearby shops ab customer live-location ke according aa sakte hain. <Link to="/shops" className="text-primary underline">Nearby shops dekho</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
