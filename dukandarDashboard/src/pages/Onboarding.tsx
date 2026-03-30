import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Store, MapPin, Package, ArrowRight, ArrowLeft, CheckCircle2, Mail, Phone, Lock, Loader2, AlertCircle, Gift, Eye, EyeOff, Navigation } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { businessTypeApi, businessApi, planApi, referralApi, type BusinessType, type Business, type Plan, type ReferralOffer } from "@/lib/api/index";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { loadRazorpayScript } from "@/lib/razorpay";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPlanFeatureSummary } from "@/lib/planFeatures";

const GoogleColorIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-6.9 0-.6-.1-1.2-.2-1.7H12z" />
    <path fill="#34A853" d="M12 22c2.6 0 4.8-.9 6.4-2.5l-3.1-2.4c-.9.6-2 1-3.3 1-2.5 0-4.6-1.7-5.3-4l-3.2 2.5C5.1 19.7 8.3 22 12 22z" />
    <path fill="#FBBC05" d="M6.7 14.1c-.2-.6-.3-1.3-.3-2.1s.1-1.4.3-2.1l-3.2-2.5C2.9 8.8 2.5 10.3 2.5 12s.4 3.2 1 4.6l3.2-2.5z" />
    <path fill="#4285F4" d="M12 5.9c1.4 0 2.7.5 3.7 1.5l2.8-2.8C16.8 2.9 14.6 2 12 2 8.3 2 5.1 4.3 3.5 7.4l3.2 2.5c.7-2.3 2.8-4 5.3-4z" />
  </svg>
);

const FacebookColorIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path fill="#1877F2" d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1c0 6 4.4 11 10.1 12v-8.4H7.1v-3.6h3V9.4c0-3 1.8-4.7 4.6-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.3h3.4l-.5 3.6H14v8.4c5.6-1 10-6 10-12z" />
    <path fill="#fff" d="M16.9 15.7l.5-3.6H14V9.8c0-1 .5-1.9 2-1.9h1.5v-3s-1.4-.2-2.7-.2c-2.8 0-4.6 1.7-4.6 4.7v2.7h-3v3.6h3v8.4c.6.1 1.2.2 1.9.2s1.3-.1 1.9-.2v-8.4h2.9z" />
  </svg>
);

const steps = [
  { icon: User, title: "Owner Details", desc: "Tell us about yourself" },
  { icon: Store, title: "Shop Details", desc: "Your business info" },
  { icon: MapPin, title: "Location", desc: "Where are you located?" },
  { icon: Package, title: "Offerings", desc: "What do you offer?" },
  { icon: CheckCircle2, title: "Choose Plan", desc: "Pick a plan and pay online" },
];

const OFFERING_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'product', label: 'Product' },
  { value: 'service', label: 'Service' },
  { value: 'food', label: 'Food' },
  { value: 'course', label: 'Course' },
  { value: 'rental', label: 'Rental' },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { register, loginWithGoogle, loginWithFacebook, user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  
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
    offering: ""
  });
  
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [socialProvider, setSocialProvider] = useState<"google" | "facebook" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingBusinessTypes, setLoadingBusinessTypes] = useState(true);
  const [error, setError] = useState("");
  const hasCheckedBusiness = useRef(false);

  const [isGettingLiveLocation, setIsGettingLiveLocation] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  const [createdBusiness, setCreatedBusiness] = useState<Business | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [isPaying, setIsPaying] = useState(false);

  const [referralOffers, setReferralOffers] = useState<ReferralOffer[]>([]);
  const [selectedReferralOfferId, setSelectedReferralOfferId] = useState<string>("");
  const [referralApplied, setReferralApplied] = useState(false);
  const [appliedReferralKey, setAppliedReferralKey] = useState<string>("");

  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load social auth SDK"));
      document.body.appendChild(script);
    });

  useEffect(() => {
    if (user && step === 0) {
      setData((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || "",
      }));
    }
  }, [step, user]);

  useEffect(() => {
    const pendingRaw = sessionStorage.getItem("pendingOnboardingData");
    if (!pendingRaw) return;
    const params = new URLSearchParams(location.search);
    const stepFromQuery = params.get("step");

    try {
      const pending = JSON.parse(pendingRaw);
      setData((prev) => ({ ...prev, ...pending }));
      if (stepFromQuery === "1") {
        setStep(1);
      } else if (isAuthenticated) {
        setStep(1);
      }
    } catch {
      sessionStorage.removeItem("pendingOnboardingData");
    }
  }, [isAuthenticated, location.search]);

  useEffect(() => {
    const nextKey = `${data.referralCode.trim().toUpperCase()}|${selectedReferralOfferId}`;
    if (appliedReferralKey && nextKey !== appliedReferralKey) {
      setReferralApplied(false);
      setAppliedReferralKey("");
    }
  }, [data.referralCode, selectedReferralOfferId, appliedReferralKey]);

  // Fetch business types from backend
  useEffect(() => {
    const fetchBusinessTypes = async () => {
      try {
        const response = await businessTypeApi.getAllBusinessTypes();
        if (response.success && response.data) {
          setBusinessTypes(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch business types:", err);
        // Fallback business types if API fails
        setBusinessTypes([
          { 
            _id: "1", 
            name: "Kirana Store", 
            slug: "kirana-store", 
            description: "General grocery and daily essentials store",
            suggestedListingType: "product",
            exampleCategories: ["Grocery", "Dairy", "Snacks", "Beverages"],
            isActive: true,
            displayOrder: 1,
            createdAt: "", 
            updatedAt: "" 
          },
          { 
            _id: "2", 
            name: "Restaurant", 
            slug: "restaurant", 
            description: "Food service and dining establishment",
            suggestedListingType: "food",
            exampleCategories: ["Fast Food", "Chinese", "Indian", "Desserts"],
            isActive: true,
            displayOrder: 2,
            createdAt: "", 
            updatedAt: "" 
          },
          { 
            _id: "3", 
            name: "Coaching Center", 
            slug: "coaching-center", 
            description: "Educational and training institute",
            suggestedListingType: "course",
            exampleCategories: ["Competitive Exams", "School Tuition", "Language Classes"],
            isActive: true,
            displayOrder: 3,
            createdAt: "", 
            updatedAt: "" 
          },
          { 
            _id: "4", 
            name: "Salon & Spa", 
            slug: "salon-spa", 
            description: "Beauty and wellness services",
            suggestedListingType: "service",
            exampleCategories: ["Hair Services", "Facial", "Massage", "Nail Art"],
            isActive: true,
            displayOrder: 4,
            createdAt: "", 
            updatedAt: "" 
          },
        ]);
      } finally {
        setLoadingBusinessTypes(false);
      }
    };

    if (step === 1) {
      fetchBusinessTypes();
    }
  }, [step]);

  // Auto-select offering based on selected business type.
  // This keeps onboarding consistent with BusinessType.suggestedListingType.
  useEffect(() => {
    if (!data.businessType) return;
    if (loadingBusinessTypes) return;

    const selected = businessTypes.find((bt) => bt._id === data.businessType);
    const suggested = selected?.suggestedListingType;
    if (!suggested) return;

    // Only auto-fill when empty or when current value is not one of our supported options.
    // User can still override in the Offerings step.
    const isSupported = OFFERING_OPTIONS.some((o) => o.value === data.offering);
    if (!data.offering || !isSupported) {
      setData((prev) => ({ ...prev, offering: suggested }));
    }
  }, [data.businessType, data.offering, businessTypes, loadingBusinessTypes]);

  // Prefill referral code from query param (?ref=XXXX)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref) {
      setData((prev) => ({ ...prev, referralCode: ref.toUpperCase().trim() }));
    }
    // only run when URL changes
  }, [location.search]);

  // If user is already authenticated:
  // - with active plan => go dashboard
  // - with business but no active plan => force plan selection in onboarding
  // - with no business => stay in onboarding
  useEffect(() => {
    if (!isAuthenticated || hasCheckedBusiness.current) return;
    hasCheckedBusiness.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await businessApi.getMyBusinesses({ force: true });
        const businesses = res.success && res.data ? res.data : [];
        const business = businesses[0];
        if (cancelled || !business) return;

        const expiresAt = business.planExpiresAt ? new Date(business.planExpiresAt) : null;
        const hasActivePlan = !!business.plan && !!expiresAt && expiresAt.getTime() > Date.now();

        if (hasActivePlan) {
          navigate("/dashboard");
          return;
        }

        // Resume onboarding at plan selection
        setCreatedBusiness(business);

        const plansRes = await planApi.getPlans();
        if (!cancelled && plansRes.success && plansRes.data) {
          setPlans(plansRes.data);
          if (plansRes.data.length > 0) {
            setSelectedPlanId(plansRes.data[0]._id);
          }
        }

        try {
          const refRes = await referralApi.getMyReferralStats();
          const offers = refRes.success && refRes.data?.offers ? refRes.data.offers : [];
          if (!cancelled) {
            setReferralOffers(offers);
            const firstActive = offers.find((o) => o.status === "active" && o.isActive);
            if (firstActive) setSelectedReferralOfferId(firstActive._id);
          }
        } catch {
          // Ignore referral offers load failures
        }

        if (!cancelled) setStep(4);
      } catch {
        // Stay on onboarding if business lookup fails
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate]);

  const update = (key: string, val: string) => setData(prev => ({ ...prev, [key]: val }));
  
  const canNext = () => {
    if (step === 0) {
      const hasSocialSession = !!user;
      if (hasSocialSession) return data.name.length > 1 && data.email && data.phone.length === 10;
      return data.name.length > 1 && data.email && data.phone.length === 10 && data.password.length >= 6;
    }
    if (step === 1) return data.shop_name.length > 1 && data.businessType;
    if (step === 2) return data.city && data.state && data.area && data.pincode.length === 6;
    if (step === 3) return data.offering;
    if (step === 4) {
      if (!selectedPlanId) return false;
      if (data.referralCode.trim()) return !!selectedReferralOfferId;
      return true;
    }
    return true;
  };

  const next = async () => {
    if (step === 0) {
      if (!isAuthenticated) {
        await handleRegisterAndVerify();
        return;
      }
      setStep(1);
      return;
    }

    if (step < 3) {
      setStep(s => s + 1);
    } else if (step === 3) {
      // Create business, then choose plan
      await handleCreateBusinessAndContinue();
    } else if (step === 4) {
      await handleChoosePlanAndFinish();
    }
  };

  const handleRegisterAndVerify = async () => {
    setError("");
    setIsLoading(true);

    try {
      const registerResult = await register(
        data.name,
        data.email,
        data.phone,
        data.password,
        data.referralCode?.trim() || undefined,
        undefined
      );

      if ('verificationRequired' in registerResult && registerResult.verificationRequired) {
        sessionStorage.setItem("pendingVerificationEmail", data.email);
        sessionStorage.setItem("pendingOnboardingData", JSON.stringify(data));
        navigate("/otp-verification", { state: { email: data.email, flow: "onboarding" } });
        return;
      }

      // Verification disabled scenario: continue directly
      setStep(1);
    } catch (err: any) {
      setError(err.message || "Failed to register. Please try again.");
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: err.message || "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!googleClientId) {
      setError("Google signup is not configured.");
      return;
    }

    setError("");
    setIsSocialLoading(true);
    setSocialProvider("google");

    try {
      await loadScript("https://accounts.google.com/gsi/client");
      const google = (window as any).google;
      if (!google?.accounts?.oauth2?.initTokenClient) throw new Error("Google SDK unavailable");

      const accessToken = await new Promise<string>((resolve, reject) => {
        let settled = false;
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "openid email profile",
          callback: (response: any) => {
            settled = true;
            if (response?.error) {
              reject(new Error(response.error_description || response.error || "Google signup failed"));
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
          if (!settled) reject(new Error("Google signup was cancelled or timed out"));
        }, 20000);
      });

      await loginWithGoogle(accessToken);
      toast({ title: "Google connected", description: "Continue onboarding to finish setup." });
    } catch (err: any) {
      const message = err.message || "Google signup failed";
      setError(message);
      toast({ variant: "destructive", title: "Google signup failed", description: message });
    } finally {
      setIsSocialLoading(false);
      setSocialProvider(null);
    }
  };

  const handleFacebookSignup = async () => {
    if (!facebookAppId) {
      setError("Facebook signup is not configured.");
      return;
    }

    setError("");
    setIsSocialLoading(true);
    setSocialProvider("facebook");

    try {
      await loadScript("https://connect.facebook.net/en_US/sdk.js");
      const FB = (window as any).FB;
      if (!FB) throw new Error("Facebook SDK unavailable");

      await new Promise<void>((resolve) => {
        FB.init({ appId: facebookAppId, cookie: true, xfbml: false, version: "v19.0" });
        resolve();
      });

      const accessToken = await new Promise<string>((resolve, reject) => {
        FB.login(
          (response: any) => {
            const token = response?.authResponse?.accessToken;
            if (!token) {
              reject(new Error("Facebook signup cancelled"));
              return;
            }
            resolve(token);
          },
          { scope: "email,public_profile" }
        );
      });

      await loginWithFacebook(accessToken);
      toast({ title: "Facebook connected", description: "Continue onboarding to finish setup." });
    } catch (err: any) {
      const message = err.message || "Facebook signup failed";
      setError(message);
      toast({ variant: "destructive", title: "Facebook signup failed", description: message });
    } finally {
      setIsSocialLoading(false);
      setSocialProvider(null);
    }
  };

  const handleCreateBusinessAndContinue = async () => {
    setError("");
    setIsLoading(true);

    try {
      if (!isAuthenticated) {
        throw new Error("Please register and verify your email first.");
      }

      // Create business after verification
      const offeringLabel = OFFERING_OPTIONS.find((o) => o.value === data.offering)?.label || data.offering;

      const businessData = {
        name: data.shop_name,
        businessType: data.businessType, // BusinessType ID
        phone: data.phone,
        whatsapp: data.phone,
        email: data.email,
        address: {
          street: data.area,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          ...(liveLocation
            ? {
                location: {
                  type: "Point",
                  coordinates: [liveLocation.lng, liveLocation.lat],
                },
              }
            : {}),
        },
        description: `${data.shop_name} - ${offeringLabel}`,
      };

      const businessResponse = await businessApi.createBusiness(businessData);

      if (businessResponse.success && businessResponse.data) {
        sessionStorage.removeItem("pendingOnboardingData");
        setCreatedBusiness(businessResponse.data);

        const plansRes = await planApi.getPlans();
        if (plansRes.success && plansRes.data) {
          setPlans(plansRes.data);
          if (plansRes.data.length > 0) {
            setSelectedPlanId(plansRes.data[0]._id);
          }
        }

        // Load referral offers so user can choose which one to apply (optional)
        try {
          const refRes = await referralApi.getMyReferralStats();
          const offers = refRes.success && refRes.data?.offers ? refRes.data.offers : [];
          setReferralOffers(offers);
          const firstActive = offers.find((o) => o.status === "active" && o.isActive);
          if (firstActive) setSelectedReferralOfferId(firstActive._id);
        } catch {
          // Ignore referral offers load failures
        }

        toast({
          title: "Success!",
          description: "Account created. Now choose a plan.",
        });

        setStep(4);
      } else {
        throw new Error(businessResponse.message || "Failed to create business");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: err.message || "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pickLiveLocation = async () => {
    setError("");

    if (typeof window === "undefined") return;
    if (!navigator.geolocation) {
      toast({
        title: "Not supported",
        description: "Geolocation is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

    setIsGettingLiveLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = clamp(pos.coords.latitude, -90, 90);
        const lng = clamp(pos.coords.longitude, -180, 180);
        setLiveLocation({ lat, lng });

        // Best-effort reverse geocode to auto-fill city/state/pincode/area.
        try {
          setIsResolvingAddress(true);

          const key = (googleMapsApiKey || "").trim();
          if (!key) {
            toast({
              title: "Live location selected",
              description: "Coordinates saved. (VITE_GOOGLE_MAPS_API_KEY missing; address auto-fill skipped)",
            });
            return;
          }

          const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
            `${lat},${lng}`
          )}&key=${encodeURIComponent(key)}`;
          const res = await fetch(url);
          const json = await res.json();
          const first = json?.results?.[0];
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
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  };

  const applyReferralIfNeeded = async () => {
    const code = data.referralCode.trim();
    const key = `${code.toUpperCase()}|${selectedReferralOfferId}`;
    if (!code) return;
    if (referralApplied && appliedReferralKey === key) return;
    if (!selectedReferralOfferId) {
      throw new Error("Please choose a referral offer");
    }

    // Save the selected offer to DB so it reflects in user/admin dashboards.
    // This is the same endpoint used when user selects offer later in Referrals page.
    const setOfferRes = await referralApi.setMyActiveReferralOffer({ offerId: selectedReferralOfferId });
    if (!setOfferRes.success) {
      throw new Error(setOfferRes.message || 'Failed to save selected referral offer');
    }

    const res = await referralApi.createReferral({
      referralCode: code,
      offerId: selectedReferralOfferId,
    });

    if (res.success) {
      const returnedCode = res.data?.referralCode ? String(res.data.referralCode).toUpperCase().trim() : '';
      const expectedCode = code.toUpperCase().trim();
      if (returnedCode && returnedCode !== expectedCode) {
        throw new Error('Referral already applied with a different code');
      }

      setReferralApplied(true);
      setAppliedReferralKey(key);
      return;
    }

    const msg = res.message || "Failed to apply referral";
    if (msg.toLowerCase().includes("already exists")) {
      setReferralApplied(true);
      setAppliedReferralKey(key);
      return;
    }

    throw new Error(msg);
  };

  const handleChoosePlanAndFinish = async () => {
    if (!createdBusiness?._id) {
      setError("Business not created yet. Please go back and try again.");
      return;
    }
    if (!selectedPlanId) {
      setError("Please select a plan");
      return;
    }

    const selectedPlan = plans.find((p) => p._id === selectedPlanId);
    if (!selectedPlan) {
      setError("Selected plan not found");
      return;
    }

    setError("");
    setIsPaying(true);
    let deferPayingReset = false;

    try {
      // Apply referral (optional) before plan activation/payment
      await applyReferralIfNeeded();

      // Free plan: activate directly
      if (!selectedPlan.price || selectedPlan.price <= 0) {
        const res = await planApi.subscribeToPlan(selectedPlan._id, createdBusiness._id);
        if (!res.success) throw new Error(res.message || "Failed to activate plan");
        toast({ title: "Success", description: "Plan activated successfully" });
        await businessApi.getMyBusinesses({ force: true });
        navigate("/dashboard");
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok || !window.Razorpay) {
        throw new Error("Failed to load Razorpay");
      }

      const orderRes = await planApi.createRazorpayOrder(selectedPlan._id, createdBusiness._id);
      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.message || "Failed to create payment order");
      }

      if ((orderRes.data as any).isFree) {
        const res = await planApi.subscribeToPlan(selectedPlan._id, createdBusiness._id);
        if (!res.success) throw new Error(res.message || "Failed to activate plan");
        toast({ title: "Success", description: "Plan activated successfully" });
        await businessApi.getMyBusinesses({ force: true });
        navigate("/dashboard");
        return;
      }

      const data = orderRes.data as any;
      const order = data.order;
      const keyId = data.keyId;

      deferPayingReset = true;
      const rzp = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "ApniDukan",
        description: selectedPlan.description || `Purchase ${selectedPlan.name}`,
        order_id: order.id,
        handler: async (response: any) => {
          const verifyRes = await planApi.verifyRazorpayPayment({
            planId: selectedPlan._id,
            businessId: createdBusiness._id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (!verifyRes.success) {
            toast({
              variant: "destructive",
              title: "Payment failed",
              description: verifyRes.message || "Payment verification failed",
            });
            setIsPaying(false);
            return;
          }

          toast({ title: "Payment success", description: "Plan activated successfully" });
          await businessApi.getMyBusinesses({ force: true });
          setIsPaying(false);
          navigate("/dashboard");
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
          },
        },
        theme: {
          color: "#1DBF73",
        },
        notes: order.notes,
      });

      rzp.open();
    } catch (err: any) {
      setError(err.message || "Failed to complete payment");
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to complete payment",
      });
    } finally {
      if (!deferPayingReset) setIsPaying(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center px-4 py-4 sm:py-8">
      <div className="max-w-md mx-auto w-full bg-card rounded-2xl shadow-xl border p-4 sm:p-6 flex flex-col max-h-[94dvh]">
      <div className="flex-1 overflow-y-auto pr-1">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">{steps[step].title}</h2>
              <p className="text-sm text-muted-foreground">{steps[step].desc}</p>
            </div>

            {/* Step 0 - Owner Details */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignup}
                    disabled={isSocialLoading}
                    className="w-full border border-slate-300 bg-white text-slate-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {isSocialLoading && socialProvider === "google" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
                      </>
                    ) : (
                      <>
                        <GoogleColorIcon /> Google
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleFacebookSignup}
                    disabled={isSocialLoading}
                    className="w-full border border-[#1877F2] bg-[#1877F2] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#166FE5] hover:border-[#166FE5] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {isSocialLoading && socialProvider === "facebook" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
                      </>
                    ) : (
                      <>
                        <FacebookColorIcon /> Facebook
                      </>
                    )}
                  </button>
                </div>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or fill details manually</span>
                  </div>
                </div>

                <input
                  placeholder="Your Full Name"
                  value={data.name}
                  onChange={e => update("name", e.target.value)}
                  className="w-full px-4 py-3.5 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={data.email}
                    onChange={e => update("email", e.target.value)}
                    disabled={isAuthenticated}
                    className="w-full pl-11 pr-4 py-3.5 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                </div>
                {isAuthenticated ? (
                  <p className="text-xs text-muted-foreground">Verified email can’t be changed during onboarding.</p>
                ) : null}
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm font-medium text-foreground">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={data.phone}
                    onChange={e => update("phone", e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-[4.5rem] pr-4 py-3.5 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create password (min 6 characters)"
                    value={data.password}
                    onChange={e => update("password", e.target.value)}
                    disabled={!!user}
                    className="w-full pl-11 pr-11 py-3.5 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={!!user}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {user ? (
                  <p className="text-xs text-muted-foreground">Password is not required for social signup.</p>
                ) : null}

                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    placeholder="Referral Code (optional)"
                    value={data.referralCode}
                    onChange={(e) => update("referralCode", e.target.value.toUpperCase().trim())}
                    className="w-full pl-11 pr-4 py-3.5 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-foreground">Pehle demo dukan dekh lo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Is preview se aapko samajh aayega ki customers ko aapki online dukan kaisi dikhegi.
                  </p>
                  <Link
                    to="/shop/ram-kirana-store"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    <Gift className="w-4 h-4" /> Demo Dukan Dekhein
                  </Link>
                </div>
              </div>
            )}

            {/* Step 1 - Shop Details */}
            {step === 1 && (
              <div className="space-y-4">
                <input
                  placeholder="Shop / Business Name"
                  value={data.shop_name}
                  onChange={e => update("shop_name", e.target.value)}
                  className="w-full px-4 py-3.5 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Select Your Business Type</p>
                  {loadingBusinessTypes ? (
                    <div className="space-y-3 py-2">
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {businessTypes.map(bt => (
                        <motion.button
                          key={bt._id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            update("businessType", bt._id);
                            if (bt.suggestedListingType) {
                              update("offering", bt.suggestedListingType);
                            }
                          }}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            data.businessType === bt._id
                              ? "bg-primary/10 border-primary shadow-sm"
                              : "bg-card border-border hover:border-primary/40 hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-semibold text-sm ${
                                  data.businessType === bt._id ? "text-primary" : "text-foreground"
                                }`}>
                                  {bt.name}
                                </h3>
                                {bt.suggestedListingType && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                                    {bt.suggestedListingType}
                                  </span>
                                )}
                              </div>
                              {bt.description && (
                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                  {bt.description}
                                </p>
                              )}
                              {bt.exampleCategories && bt.exampleCategories.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {bt.exampleCategories.slice(0, 3).map((cat, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                                    >
                                      {cat}
                                    </span>
                                  ))}
                                  {bt.exampleCategories.length > 3 && (
                                    <span className="text-[10px] px-2 py-0.5 text-muted-foreground">
                                      +{bt.exampleCategories.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {data.businessType === bt._id && (
                              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2 - Location */}
            {step === 2 && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={pickLiveLocation}
                  disabled={isGettingLiveLocation || isResolvingAddress || isLoading}
                  className="flex items-center gap-2 text-sm text-primary font-medium disabled:opacity-60"
                >
                  {isGettingLiveLocation || isResolvingAddress ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                  {isResolvingAddress ? "Auto-filling address..." : "Use my current location"}
                </button>

                <input
                  placeholder="City"
                  value={data.city}
                  onChange={e => update("city", e.target.value)}
                  className="w-full px-4 py-3.5 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  placeholder="State"
                  value={data.state}
                  onChange={e => update("state", e.target.value)}
                  className="w-full px-4 py-3.5 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  placeholder="Area / Locality / Street"
                  value={data.area}
                  onChange={e => update("area", e.target.value)}
                  className="w-full px-4 py-3.5 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  placeholder="Pincode"
                  value={data.pincode}
                  onChange={e => update("pincode", e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  className="w-full px-4 py-3.5 bg-card border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}

            {/* Step 3 - Offerings */}
            {step === 3 && (
              <div className="space-y-3">
                {OFFERING_OPTIONS.map((o) => (
                  <motion.button
                    key={o.value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => update("offering", o.value)}
                    className={`w-full px-4 py-4 rounded-xl text-left font-medium border transition-all flex items-center justify-between ${
                      data.offering === o.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    {o.label}
                    {data.offering === o.value && <CheckCircle2 className="w-5 h-5" />}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Step 4 - Choose Plan */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">Business</p>
                  <p className="text-base font-bold text-foreground">{createdBusiness?.name || data.shop_name}</p>
                </div>

                <div className="space-y-3">
                  {plans.length === 0 ? (
                    <div className="space-y-3 py-2">
                      <Skeleton className="h-24 w-full rounded-lg" />
                      <Skeleton className="h-24 w-full rounded-lg" />
                    </div>
                  ) : (
                    plans.map((plan) => {
                      const selected = selectedPlanId === plan._id;
                      const lines = buildPlanFeatureSummary(plan.features);

                      return (
                        <motion.div key={plan._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                          <div
                            className={`rounded-lg border p-4 transition-all ${
                              selected ? "bg-primary/5 border-primary/40" : "bg-card hover:border-primary/30"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{plan.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">₹{plan.price} / {plan.durationInDays} days</p>
                                {plan.description ? (
                                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                                ) : null}
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

                            <ul className="mt-3 space-y-1">
                              {lines.slice(0, 6).map((f) => (
                                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {data.referralCode.trim() ? (
                  <div className="bg-card border rounded-xl p-4">
                    <p className="text-sm font-semibold text-foreground">Referral</p>
                    <p className="text-xs text-muted-foreground mt-1">You entered a referral code. Choose which admin offer to apply.</p>

                    <div className="mt-3 space-y-2">
                      <input
                        placeholder="Referral Code"
                        value={data.referralCode}
                        onChange={(e) => update("referralCode", e.target.value.toUpperCase().trim())}
                        className="w-full px-4 py-3 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                              {o.offerName} (threshold {o.referralThreshold})
                            </option>
                          ))}
                      </select>

                      {referralApplied ? (
                        <p className="text-xs text-emerald-600">Referral applied.</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="pt-4 border-t mt-4">
        {/* Bottom Actions */}
        <div className="flex gap-3">
          {step > 0 && step < 4 && !isLoading && !isPaying && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-3.5 bg-card border rounded-xl font-medium hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={next}
            disabled={!canNext() || isLoading || isPaying}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold disabled:opacity-40 shadow-lg shadow-primary/20 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {step === 0 && !isAuthenticated ? "Creating your account..." : "Creating your business..."}
              </>
            ) : isPaying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing payment...
              </>
            ) : (
              <>
                {step === 4
                  ? (plans.find((p) => p._id === selectedPlanId)?.price || 0) > 0
                    ? "Pay & Finish"
                    : "Activate & Finish"
                  : step === 3
                    ? "Start Your Dukaan"
                    : "Continue"}{" "}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} className="text-primary font-semibold">Login</button>
        </p>
      </div>
      </div>
    </div>
  );
};

export default Onboarding;
