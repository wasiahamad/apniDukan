import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, ArrowRight, ArrowLeft, Store, User, MapPin, Package, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "@/lib/publicShopsApi";
import { getDashboardUrl } from "@/lib/dashboardUrl";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPlanFeatureSummary } from "@/lib/planFeatures";
import { loadRazorpayScript } from "@/lib/razorpay";
import { loadGoogleMaps } from "@/lib/googleMaps";

type BusinessType = {
  _id: string;
  name: string;
  slug: string;
  suggestedListingType?: "product" | "service" | "food" | "course" | "rental";
  icon?: string;
  isActive?: boolean;
};

type RegisterResponse =
  | {
      user: any;
      accessToken: string;
      refreshToken: string;
    }
  | {
      user: any;
      verificationRequired: true;
      otpExpiresInMinutes: number;
    };

type Plan = {
  _id: string;
  name: string;
  price?: number;
  durationInDays?: number;
  description?: string;
  features?: Record<string, any>;
};

type ReferralOffer = {
  _id: string;
  offerName?: string;
  referralThreshold?: number;
  status?: string;
  isActive?: boolean;
};

type Business = {
  _id: string;
  name?: string;
};

const OFFERING_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "product", label: "Product" },
  { value: "service", label: "Service" },
  { value: "food", label: "Food" },
  { value: "course", label: "Course" },
  { value: "rental", label: "Rental" },
];

const setSession = (data: { accessToken: string; refreshToken: string; user: any }) => {
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem("user", JSON.stringify(data.user));
};

const DRAFT_KEY = "apnidukan:RegisterShopDialogDraft:v1";
const DRAFT_PASSWORD_KEY = "apnidukan:RegisterShopDialogDraftPassword:v1";
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type RegisterShopDraftV1 = {
  v: 1;
  updatedAt: number;
  step: 0 | 1 | 2 | 3 | 4;
  verificationRequired: boolean;
  data: Omit<
    {
      name: string;
      email: string;
      phone: string;
      password: string;
      referralCode: string;
      shop_name: string;
      businessType: string;
      city: string;
      state: string;
      area: string;
      pincode: string;
      offering: string;
    },
    "password"
  >;
  liveLocation: { lat: number; lng: number } | null;
  createdBusiness: Business | null;
  selectedPlanId: string;
  selectedReferralOfferId: string;
  referralApplied: boolean;
  appliedReferralKey: string;
};

const safeJsonParse = (raw: string): any => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default function RegisterShopDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);

  const draftRestoredRef = useRef(false);
  const suspendDraftWriteRef = useRef(false);

  const [data, setData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    referralCode: "",
    shop_name: "",
    businessType: "",
    city: "",
    state: "",
    area: "",
    pincode: "",
    offering: "",
  });

  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [loadingBusinessTypes, setLoadingBusinessTypes] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>("");

  const [isRegistering, setIsRegistering] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);

  const [isGettingLiveLocation, setIsGettingLiveLocation] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  const [createdBusiness, setCreatedBusiness] = useState<Business | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [referralOffers, setReferralOffers] = useState<ReferralOffer[]>([]);
  const [selectedReferralOfferId, setSelectedReferralOfferId] = useState<string>("");
  const [referralApplied, setReferralApplied] = useState(false);
  const [appliedReferralKey, setAppliedReferralKey] = useState<string>("");

  const dashboardUrl = getDashboardUrl();

  const clearDraft = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    try {
      sessionStorage.removeItem(DRAFT_PASSWORD_KEY);
    } catch {
      // ignore
    }
  };

  const isDraftMeaningful = (nextStep: number, nextData: typeof data) => {
    if (nextStep !== 0) return true;
    if (verificationRequired) return true;
    if (liveLocation) return true;
    if (createdBusiness?._id) return true;
    if (selectedPlanId) return true;
    if (selectedReferralOfferId) return true;

    return Object.entries(nextData).some(([k, v]) => {
      if (k === "password") return false; // saved separately in sessionStorage
      return typeof v === "string" && v.trim().length > 0;
    });
  };

  // Restore draft after refresh so user can continue from the same step.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (draftRestoredRef.current) return;

    const raw = (() => {
      try {
        return localStorage.getItem(DRAFT_KEY);
      } catch {
        return null;
      }
    })();

    if (!raw) {
      draftRestoredRef.current = true;
      return;
    }

    const parsed = safeJsonParse(raw) as RegisterShopDraftV1 | null;
    if (!parsed || parsed.v !== 1 || typeof parsed.updatedAt !== "number") {
      clearDraft();
      draftRestoredRef.current = true;
      return;
    }

    if (Date.now() - parsed.updatedAt > DRAFT_MAX_AGE_MS) {
      clearDraft();
      draftRestoredRef.current = true;
      return;
    }

    suspendDraftWriteRef.current = true;
    try {
      const nextStep: 0 | 1 | 2 | 3 | 4 =
        parsed.step === 0 || parsed.step === 1 || parsed.step === 2 || parsed.step === 3 || parsed.step === 4 ? parsed.step : 0;

      setStep(nextStep);
      setVerificationRequired(!!parsed.verificationRequired);
      setLiveLocation(parsed.liveLocation || null);
      setCreatedBusiness(parsed.createdBusiness || null);
      setSelectedPlanId(parsed.selectedPlanId || "");
      setSelectedReferralOfferId(parsed.selectedReferralOfferId || "");
      setReferralApplied(!!parsed.referralApplied);
      setAppliedReferralKey(parsed.appliedReferralKey || "");

      const pw = (() => {
        try {
          return sessionStorage.getItem(DRAFT_PASSWORD_KEY) || "";
        } catch {
          return "";
        }
      })();

      const restoredData = parsed.data && typeof parsed.data === "object" ? parsed.data : ({} as any);
      setData((prev) => ({ ...prev, ...restoredData, password: pw }));

      // If user refreshed mid-onboarding, reopen dialog so they continue where they left off.
      setOpen(true);
    } finally {
      draftRestoredRef.current = true;
      // allow draft writes on next tick (after state has settled)
      setTimeout(() => {
        suspendDraftWriteRef.current = false;
      }, 0);
    }
  }, []);

  // Persist draft as user types, so refresh doesn't lose progress.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!draftRestoredRef.current) return;
    if (suspendDraftWriteRef.current) return;

    if (!isDraftMeaningful(step, data)) {
      clearDraft();
      return;
    }

    const safeData = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      referralCode: data.referralCode,
      shop_name: data.shop_name,
      businessType: data.businessType,
      city: data.city,
      state: data.state,
      area: data.area,
      pincode: data.pincode,
      offering: data.offering,
    };

    const draft: RegisterShopDraftV1 = {
      v: 1,
      updatedAt: Date.now(),
      step,
      verificationRequired,
      data: safeData,
      liveLocation,
      createdBusiness,
      selectedPlanId,
      selectedReferralOfferId,
      referralApplied,
      appliedReferralKey,
    };

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }

    try {
      // Keep password only in session storage (still survives refresh, but not a long-lived localStorage value).
      sessionStorage.setItem(DRAFT_PASSWORD_KEY, data.password || "");
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    verificationRequired,
    liveLocation,
    createdBusiness,
    selectedPlanId,
    selectedReferralOfferId,
    referralApplied,
    appliedReferralKey,
    data,
  ]);

  const update = (key: keyof typeof data, val: string) => setData((prev) => ({ ...prev, [key]: val }));

  const reset = () => {
    suspendDraftWriteRef.current = true;
    clearDraft();

    setStep(0);
    setData({
      name: "",
      email: "",
      phone: "",
      password: "",
      referralCode: "",
      shop_name: "",
      businessType: "",
      city: "",
      state: "",
      area: "",
      pincode: "",
      offering: "",
    });
    setBusinessTypes([]);
    setLoadingBusinessTypes(false);
    setShowPassword(false);
    setError("");
    setIsRegistering(false);
    setVerificationRequired(false);
    setOtp("");
    setIsVerifyingOtp(false);
    setIsResendingOtp(false);
    setIsCreatingBusiness(false);

    setIsGettingLiveLocation(false);
    setLiveLocation(null);
    setIsResolvingAddress(false);

    setCreatedBusiness(null);
    setPlans([]);
    setSelectedPlanId("");
    setLoadingPlans(false);
    setIsPaying(false);

    setReferralOffers([]);
    setSelectedReferralOfferId("");
    setReferralApplied(false);
    setAppliedReferralKey("");

    // allow draft writes again after reset has applied
    setTimeout(() => {
      suspendDraftWriteRef.current = false;
    }, 0);
  };

  const canNext = useMemo(() => {
    if (step === 0) {
      if (verificationRequired) return otp.trim().length === 6;
      return (
        data.name.trim().length > 1 &&
        data.email.includes("@") &&
        data.phone.trim().length === 10 &&
        data.password.length >= 6
      );
    }
    if (step === 1) return data.shop_name.trim().length > 1 && !!data.businessType;
    if (step === 2) return !!data.city && !!data.state && !!data.area && data.pincode.trim().length === 6;
    if (step === 3) return !!data.offering;
    if (step === 4) {
      if (!selectedPlanId) return false;
      if (data.referralCode.trim()) return !!selectedReferralOfferId;
      return true;
    }
    return true;
  }, [data, otp, step, verificationRequired, selectedPlanId, selectedReferralOfferId]);

  useEffect(() => {
    if (!open) return;
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (step !== 1) return;
    if (businessTypes.length > 0) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingBusinessTypes(true);
        const resp = await fetch(`${API_BASE_URL}/business-types`, { cache: "no-store" });
        const json = await resp.json();
        if (!resp.ok || !json?.success) throw new Error(json?.message || "Failed to load business types");
        if (cancelled) return;
        setBusinessTypes(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        if (cancelled) return;
        setBusinessTypes([]);
        setError(e?.message || "Failed to load business types");
      } finally {
        if (!cancelled) setLoadingBusinessTypes(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, step, businessTypes.length]);

  // Auto-select offering based on business type suggestedListingType (same behavior as dashboard)
  useEffect(() => {
    if (!data.businessType) return;
    if (!businessTypes.length) return;
    const selected = businessTypes.find((b) => b._id === data.businessType);
    const suggested = selected?.suggestedListingType;
    if (!suggested) return;
    const isSupported = OFFERING_OPTIONS.some((o) => o.value === data.offering);
    if (!data.offering || !isSupported) {
      update("offering", suggested);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.businessType, businessTypes.length]);

  // If referral code changes after selecting offer, reset applied state like dashboard.
  useEffect(() => {
    const nextKey = `${data.referralCode.trim().toUpperCase()}|${selectedReferralOfferId}`;
    if (appliedReferralKey && nextKey !== appliedReferralKey) {
      setReferralApplied(false);
      setAppliedReferralKey("");
    }
  }, [data.referralCode, selectedReferralOfferId, appliedReferralKey]);

  // Load plans + referral offers when we reach Choose Plan step.
  useEffect(() => {
    if (!open) return;
    if (step !== 4) return;
    if (!createdBusiness?._id) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingPlans(true);

        const plansResp = await fetch(`${API_BASE_URL}/plans`, { cache: "no-store" });
        const plansJson = await plansResp.json();
        const list = plansResp.ok && plansJson?.success && Array.isArray(plansJson.data) ? plansJson.data : [];
        if (cancelled) return;
        setPlans(list);
        if (!selectedPlanId && list.length > 0) {
          setSelectedPlanId(list[0]._id);
        }

        // Referral offers are protected behind auth; best-effort.
        try {
          const token = localStorage.getItem("accessToken");
          if (token) {
            const refResp = await fetch(`${API_BASE_URL}/referrals/my/stats`, {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            });
            const refJson = await refResp.json();
            const offers = refResp.ok && refJson?.success ? refJson?.data?.offers : [];
            if (!cancelled && Array.isArray(offers)) {
              setReferralOffers(offers);
              const firstActive = offers.find((o: any) => o?.status === "active" && o?.isActive);
              if (firstActive && !selectedReferralOfferId) setSelectedReferralOfferId(firstActive._id);
            }
          }
        } catch {
          // ignore
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load plans");
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, createdBusiness?._id]);

  const registerOwner = async () => {
    setError("");
    setIsRegistering(true);
    try {
      const payload = {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        password: data.password,
        referralCode: data.referralCode.trim() || undefined,
      };

      if (payload.phone.length !== 10) {
        throw new Error("Phone number 10 digits hona chahiye");
      }
      if (payload.password.length < 6) {
        throw new Error("Password kam se kam 6 characters ka hona chahiye");
      }

      const resp = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.success || !json?.data) {
        throw new Error(json?.message || "Registration failed");
      }

      const result = json.data as RegisterResponse;
      if ("accessToken" in result) {
        setSession(result);
        toast({ title: "Registered", description: "Account create ho gaya" });
        setStep(1);
        return;
      }

      setVerificationRequired(true);
      toast({
        title: "OTP sent",
        description: "Email pe OTP aaya hoga. Verify karke account activate karein.",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    setIsVerifyingOtp(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/verify-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email.trim(), otp: otp.trim() }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.success || !json?.data) {
        throw new Error(json?.message || "OTP verification failed");
      }

      const auth = json.data as any;
      if (!auth?.accessToken || !auth?.refreshToken) {
        throw new Error("OTP verified, but token missing");
      }

      setSession(auth);
      setVerificationRequired(false);
      toast({ title: "Verified", description: "Account activate ho gaya" });
      setStep(1);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const resendOtp = async () => {
    setError("");
    setIsResendingOtp(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/resend-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email.trim() }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.success) {
        throw new Error(json?.message || "Failed to resend OTP");
      }
      toast({ title: "OTP resent", description: "Email check karein" });
    } finally {
      setIsResendingOtp(false);
    }
  };

  const createBusiness = async () => {
    setError("");
    setIsCreatingBusiness(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Auth token missing. Please login again.");

      const payload = {
        name: data.shop_name.trim(),
        businessType: data.businessType,
        phone: data.phone.trim(),
        whatsapp: data.phone.trim(),
        email: data.email.trim(),
        address: {
          street: data.area.trim(),
          city: data.city.trim(),
          state: data.state.trim(),
          pincode: data.pincode.trim(),
          ...(liveLocation
            ? {
                location: {
                  type: "Point",
                  coordinates: [liveLocation.lng, liveLocation.lat],
                },
              }
            : {}),
        },
        description: "",
      };

      const resp = await fetch(`${API_BASE_URL}/business`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.success) {
        throw new Error(json?.message || "Business create failed");
      }

      const business = (json?.data || null) as Business | null;
      setCreatedBusiness(business);

      toast({ title: "Shop created", description: "Ab plan select karke finish karein." });
      setStep(4);
    } finally {
      setIsCreatingBusiness(false);
    }
  };

  const applyReferralIfNeeded = async () => {
    const code = data.referralCode.trim();
    const key = `${code.toUpperCase()}|${selectedReferralOfferId}`;
    if (!code) return;
    if (referralApplied && appliedReferralKey === key) return;
    if (!selectedReferralOfferId) throw new Error("Please choose a referral offer");

    const token = localStorage.getItem("accessToken");
    if (!token) throw new Error("Auth token missing. Please login again.");

    // Save selected offer
    const setOfferResp = await fetch(`${API_BASE_URL}/referrals/my/active-offer`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ offerId: selectedReferralOfferId }),
    });
    const setOfferJson = await setOfferResp.json();
    if (!setOfferResp.ok || !setOfferJson?.success) {
      throw new Error(setOfferJson?.message || "Failed to save selected referral offer");
    }

    const resp = await fetch(`${API_BASE_URL}/referrals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ referralCode: code, offerId: selectedReferralOfferId }),
    });
    const json = await resp.json();
    if (resp.ok && json?.success) {
      setReferralApplied(true);
      setAppliedReferralKey(key);
      return;
    }

    const msg = json?.message || "Failed to apply referral";
    if (String(msg).toLowerCase().includes("already exists")) {
      setReferralApplied(true);
      setAppliedReferralKey(key);
      return;
    }

    throw new Error(msg);
  };

  const choosePlanAndFinish = async () => {
    if (!createdBusiness?._id) throw new Error("Business not created yet");
    if (!selectedPlanId) throw new Error("Please select a plan");

    const selectedPlan = plans.find((p) => p._id === selectedPlanId);
    if (!selectedPlan) throw new Error("Selected plan not found");

    setError("");
    setIsPaying(true);
    let deferPayingReset = false;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Auth token missing. Please login again.");

      await applyReferralIfNeeded();

      // Free plan: activate directly
      const price = Number(selectedPlan.price || 0);
      if (!price || price <= 0) {
        const resp = await fetch(`${API_BASE_URL}/plans/${selectedPlan._id}/subscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ businessId: createdBusiness._id }),
        });
        const json = await resp.json();
        if (!resp.ok || !json?.success) throw new Error(json?.message || "Failed to activate plan");
        toast({ title: "Success", description: "Plan activated successfully" });
        clearDraft();
        window.location.href = dashboardUrl;
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok || !window.Razorpay) throw new Error("Failed to load Razorpay");

      const orderResp = await fetch(`${API_BASE_URL}/payments/razorpay/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: selectedPlan._id, businessId: createdBusiness._id }),
      });
      const orderJson = await orderResp.json();
      if (!orderResp.ok || !orderJson?.success || !orderJson?.data) {
        throw new Error(orderJson?.message || "Failed to create payment order");
      }

      if (orderJson?.data?.isFree) {
        const resp = await fetch(`${API_BASE_URL}/plans/${selectedPlan._id}/subscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ businessId: createdBusiness._id }),
        });
        const json = await resp.json();
        if (!resp.ok || !json?.success) throw new Error(json?.message || "Failed to activate plan");
        toast({ title: "Success", description: "Plan activated successfully" });
        clearDraft();
        window.location.href = dashboardUrl;
        return;
      }

      const order = orderJson.data.order;
      const keyId = orderJson.data.keyId;

      deferPayingReset = true;
      const rzp = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "ApniDukan",
        description: selectedPlan.description || `Purchase ${selectedPlan.name}`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            const verifyResp = await fetch(`${API_BASE_URL}/payments/razorpay/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                planId: selectedPlan._id,
                businessId: createdBusiness._id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyJson = await verifyResp.json();

            if (!verifyResp.ok || !verifyJson?.success) {
              toast({
                variant: "destructive",
                title: "Payment failed",
                description: verifyJson?.message || "Payment verification failed",
              });
              setIsPaying(false);
              return;
            }

            toast({ title: "Payment success", description: "Plan activated successfully" });
            setIsPaying(false);
            clearDraft();
            window.location.href = dashboardUrl;
          } catch (e: any) {
            toast({
              variant: "destructive",
              title: "Payment failed",
              description: e?.message || "Payment verification failed",
            });
            setIsPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
          },
        },
        notes: order.notes,
      });

      rzp.open();
    } finally {
      if (!deferPayingReset) setIsPaying(false);
    }
  };

  const next = async () => {
    try {
      if (step === 0) {
        if (!verificationRequired) {
          await registerOwner();
          return;
        }
        await verifyOtp();
        return;
      }

      if (step === 3) {
        await createBusiness();
        return;
      }

      if (step === 4) {
        await choosePlanAndFinish();
        return;
      }

      setStep((s) => ((s + 1) as any));
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      toast({ title: "Error", description: e?.message || "Something went wrong", variant: "destructive" });
    }
  };

  const back = () => {
    if (step === 0) return;
    setError("");
    setStep((s) => ((s - 1) as any));
  };

  const pickLiveLocation = async () => {
    setError("");

    if (typeof window === "undefined") return;
    if (!navigator.geolocation) {
      setError("Live location is not supported on this device/browser.");
      toast({
        title: "Location not supported",
        description: "Live location is not supported on this device/browser.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLiveLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLiveLocation({ lat, lng });

        // Best-effort reverse geocode to auto-fill address fields.
        try {
          setIsResolvingAddress(true);
          const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
          if (!apiKey) {
            toast({
              title: "Live location selected",
              description: "Coordinates saved. (Maps key missing, address auto-fill skipped)",
            });
            return;
          }

          await loadGoogleMaps(apiKey);
          const geocoder = new (window as any).google.maps.Geocoder();

          const results: any[] = await new Promise((resolve, reject) => {
            geocoder.geocode({ location: { lat, lng } }, (res: any, status: string) => {
              if (status === "OK" && res && res.length) return resolve(res);
              reject(new Error(status || "Geocoder failed"));
            });
          });

          const first = results[0];
          const comps: any[] = Array.isArray(first?.address_components) ? first.address_components : [];

          const findLong = (type: string) =>
            comps.find((c) => Array.isArray(c?.types) && c.types.includes(type))?.long_name as string | undefined;

          const city =
            findLong("locality") ||
            findLong("administrative_area_level_2") ||
            findLong("sublocality") ||
            findLong("postal_town");
          const state = findLong("administrative_area_level_1");
          const pincode = findLong("postal_code");

          const area =
            findLong("sublocality_level_1") ||
            findLong("sublocality") ||
            findLong("neighborhood") ||
            findLong("route");

          setData((prev) => ({
            ...prev,
            city: prev.city || (city || ""),
            state: prev.state || (state || ""),
            pincode: prev.pincode || (pincode ? String(pincode).replace(/\D/g, "").slice(0, 6) : ""),
            area: prev.area || (area || ""),
          }));

          toast({ title: "Location filled", description: "City/State/Pincode auto-filled." });
        } catch {
          toast({
            title: "Live location selected",
            description: "Coordinates saved. Address auto-fill failed; please fill manually.",
          });
        } finally {
          setIsResolvingAddress(false);
        }

        setIsGettingLiveLocation(false);
      },
      (err) => {
        setIsGettingLiveLocation(false);
        const msg =
          err?.code === 1
            ? "Location permission denied. Please allow location access."
            : err?.code === 2
              ? "Location unavailable. Try again."
              : "Location request timed out. Try again.";
        setError(msg);
        toast({ title: "Location error", description: msg, variant: "destructive" });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  };

  const steps = [
    { icon: User, label: "Owner" },
    { icon: Store, label: "Shop" },
    { icon: MapPin, label: "Location" },
    { icon: Package, label: "Offerings" },
    { icon: CheckCircle, label: "Plan" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg p-0">
        <DialogHeader>
          <div className="px-4 pt-4">
            <DialogTitle className="text-xl">Apni Dukaan Banaye</DialogTitle>
          </div>
        </DialogHeader>

        {/* Stepper */}
        {step <= 4 ? (
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              {steps.map((s, idx) => {
                const Icon = s.icon;
                const isActive = idx === step;
                const isDone = idx < step;
                return (
                  <div key={s.label} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isDone || isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isDone ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span className={`text-[10px] text-center leading-tight ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {error ? (
              <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="px-4 pb-4 max-h-[75vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${step}-${verificationRequired ? "otp" : "main"}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              {/* Step 0 */}
              {step === 0 ? (
                <div className="space-y-4">
                  {!verificationRequired ? (
                    <>
                      <div>
                        <Label htmlFor="ob-name">Full Name *</Label>
                        <Input id="ob-name" value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="Aapka naam" />
                      </div>
                      <div>
                        <Label htmlFor="ob-email">Email *</Label>
                        <Input id="ob-email" type="email" value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="aapka@email.com" />
                      </div>
                      <div>
                        <Label htmlFor="ob-phone">Phone (10 digits) *</Label>
                        <Input
                          id="ob-phone"
                          value={data.phone}
                          onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="9876543210"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ob-pass">Password *</Label>
                        <div className="relative">
                          <Input
                            id="ob-pass"
                            type={showPassword ? "text" : "password"}
                            value={data.password}
                            onChange={(e) => update("password", e.target.value)}
                            placeholder="Minimum 6 characters"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="ob-ref">Referral Code (optional)</Label>
                        <Input id="ob-ref" value={data.referralCode} onChange={(e) => update("referralCode", e.target.value)} placeholder="XXXX" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground">
                        OTP email par bhej diya gaya hai: <span className="font-medium text-foreground">{data.email}</span>
                      </div>
                      <div>
                        <Label htmlFor="ob-otp">OTP (6 digits) *</Label>
                        <Input
                          id="ob-otp"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="123456"
                          inputMode="numeric"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isResendingOtp || !data.email}
                          onClick={resendOtp}
                          className="gap-2"
                        >
                          {isResendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Resend OTP
                        </Button>
                        <div className="text-xs text-muted-foreground">Email inbox/spam check karein</div>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {/* Step 1 */}
              {step === 1 ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ob-shop">Shop / Business Name *</Label>
                    <Input id="ob-shop" value={data.shop_name} onChange={(e) => update("shop_name", e.target.value)} placeholder="Dukaan ka naam" />
                  </div>
                  <div>
                    <Label>Business Type *</Label>
                    <Select value={data.businessType} onValueChange={(v) => update("businessType", v)}>
                      <SelectTrigger disabled={loadingBusinessTypes}>
                        <SelectValue placeholder={loadingBusinessTypes ? "Loading..." : "Select business type"} />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((bt) => (
                          <SelectItem key={bt._id} value={bt._id}>
                            {bt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              {/* Step 2 */}
              {step === 2 ? (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">Live location</div>
                        <div className="text-xs text-muted-foreground">
                          Use your current location (optional). You can still fill address manually.
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={pickLiveLocation}
                        disabled={isGettingLiveLocation || isResolvingAddress}
                        className="gap-2 shrink-0"
                      >
                        {isGettingLiveLocation || isResolvingAddress ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                        {liveLocation ? "Update" : "Use"}
                      </Button>
                    </div>

                    {isResolvingAddress ? (
                      <div className="mt-2 text-xs text-muted-foreground">Auto-filling address...</div>
                    ) : null}

                    {liveLocation ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Selected: {liveLocation.lat.toFixed(6)}, {liveLocation.lng.toFixed(6)}
                        <button
                          type="button"
                          className="ml-2 text-primary font-medium"
                          onClick={() => setLiveLocation(null)}
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <Label htmlFor="ob-state">State *</Label>
                    <Input id="ob-state" value={data.state} onChange={(e) => update("state", e.target.value)} placeholder="Bihar" />
                  </div>
                  <div>
                    <Label htmlFor="ob-city">City *</Label>
                    <Input id="ob-city" value={data.city} onChange={(e) => update("city", e.target.value)} placeholder="Gaya" />
                  </div>
                  <div>
                    <Label htmlFor="ob-area">Area / Street *</Label>
                    <Input id="ob-area" value={data.area} onChange={(e) => update("area", e.target.value)} placeholder="Near Jama Masjid" />
                  </div>
                  <div>
                    <Label htmlFor="ob-pin">Pincode *</Label>
                    <Input
                      id="ob-pin"
                      value={data.pincode}
                      onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="851202"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              ) : null}

              {/* Step 3 */}
              {step === 3 ? (
                <div className="space-y-4">
                  <div>
                    <Label>What do you offer? *</Label>
                    <Select value={data.offering} onValueChange={(v) => update("offering", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select offering" />
                      </SelectTrigger>
                      <SelectContent>
                        {OFFERING_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground mt-2">
                      Aap baad me dashboard me listings add kar sakte hain.
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Step 4 - Choose Plan */}
              {step === 4 ? (
                <div className="space-y-4">
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">Business</p>
                    <p className="text-base font-semibold text-foreground">{createdBusiness?.name || data.shop_name}</p>
                  </div>

                  <div className="space-y-3">
                    {loadingPlans ? (
                      <div className="space-y-3 py-2">
                        <Skeleton className="h-24 w-full rounded-lg" />
                        <Skeleton className="h-24 w-full rounded-lg" />
                      </div>
                    ) : plans.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No plans available.</div>
                    ) : (
                      plans.map((plan) => {
                        const selected = selectedPlanId === plan._id;
                        const lines = buildPlanFeatureSummary(plan.features || {});
                        const price = Number(plan.price || 0);
                        return (
                          <div
                            key={plan._id}
                            className={`rounded-lg border p-4 transition-all ${
                              selected ? "bg-primary/5 border-primary/40" : "bg-card hover:border-primary/30"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{plan.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  ₹{price} / {plan.durationInDays || 0} days
                                </p>
                                {plan.description ? <p className="text-xs text-muted-foreground mt-1">{plan.description}</p> : null}
                              </div>

                              <Button
                                size="sm"
                                variant={selected ? "default" : "outline"}
                                onClick={() => setSelectedPlanId(plan._id)}
                                className="shrink-0"
                              >
                                {selected ? "Selected" : "Select"}
                              </Button>
                            </div>

                            {lines.length ? (
                              <ul className="mt-3 space-y-1">
                                {lines.slice(0, 6).map((f) => (
                                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {data.referralCode.trim() ? (
                    <div className="bg-card border rounded-xl p-4">
                      <p className="text-sm font-semibold text-foreground">Referral</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You entered a referral code. Choose which admin offer to apply.
                      </p>

                      <div className="mt-3 space-y-2">
                        <Input
                          value={data.referralCode}
                          onChange={(e) => update("referralCode", e.target.value.toUpperCase().trim())}
                          placeholder="Referral Code"
                        />

                        <select
                          value={selectedReferralOfferId}
                          onChange={(e) => setSelectedReferralOfferId(e.target.value)}
                          className="w-full px-4 py-3 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="" disabled>
                            Select referral offer
                          </option>
                          {referralOffers
                            .filter((o) => o.status === "active" && o.isActive)
                            .map((o) => (
                              <option key={o._id} value={o._id}>
                                {o.offerName || "Offer"} (threshold {o.referralThreshold || 0})
                              </option>
                            ))}
                        </select>

                        {referralApplied ? <p className="text-xs text-emerald-600">Referral applied.</p> : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>

          {/* Footer buttons */}
          {step <= 4 ? (
            <div className="flex justify-between mt-5 pt-4 border-t">
              <Button variant="outline" onClick={back} disabled={step === 0 || isRegistering || isVerifyingOtp || isCreatingBusiness} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={next}
                disabled={!canNext || isRegistering || isVerifyingOtp || isCreatingBusiness || isPaying}
                className="gap-2"
              >
                {(isRegistering || isVerifyingOtp || isCreatingBusiness || isPaying) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {step === 4
                  ? (Number(plans.find((p) => p._id === selectedPlanId)?.price || 0) > 0 ? "Pay & Finish" : "Activate & Finish")
                  : step === 3
                    ? "Create shop"
                    : verificationRequired && step === 0
                      ? "Verify OTP"
                      : "Next"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
