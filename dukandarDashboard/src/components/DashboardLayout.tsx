import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, Outlet, useNavigate, useNavigationType } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, User, Palette, Package, MessageCircle, MapPin,
  BarChart3, CreditCard, Receipt, HelpCircle, Settings, Menu, X,
  ShoppingBag, ExternalLink, Sun, Moon, ChevronLeft, ChevronRight,
  ShoppingCart, Gift
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Business, businessApi } from "@/lib/api/index";
import { Skeleton } from "@/components/ui/skeleton";
import { EntitlementsContext, type BusinessEntitlements, type EntitlementFeatures } from "@/contexts/EntitlementsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "dukaansetu:theme";
const DASH_LAST_PATH_KEY = "dukaansetu:dashboard:lastPath";

const getInitialDark = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;
  } catch {
    // ignore
  }

  if (document.documentElement.classList.contains("dark")) return true;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
};

const nav: Array<{ to: string; icon: any; label: string; feature?: keyof EntitlementFeatures }> = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/business-profile", icon: User, label: "Business Profile" },
  { to: "/dashboard/branding", icon: Palette, label: "Branding", feature: "brandingEnabled" },
  { to: "/dashboard/listings", icon: Package, label: "Listings" },
  { to: "/dashboard/orders", icon: ShoppingCart, label: "Orders", feature: "ordersEnabled" },
  { to: "/dashboard/whatsapp", icon: MessageCircle, label: "WhatsApp", feature: "whatsappSettingsEnabled" },
  { to: "/dashboard/location", icon: MapPin, label: "Location" },
  { to: "/dashboard/analytics", icon: BarChart3, label: "Analytics", feature: "analyticsEnabled" },
  { to: "/dashboard/subscription", icon: CreditCard, label: "Subscription" },
  { to: "/dashboard/invoices", icon: Receipt, label: "Invoices", feature: "invoicesEnabled" },
  { to: "/dashboard/referrals", icon: Gift, label: "Referrals", feature: "referralsEnabled" },
  { to: "/dashboard/support", icon: HelpCircle, label: "Support" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings" },
];

const DashboardLayout = () => {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [business, setBusiness] = useState<Business | null>(null);
  const [entitlements, setEntitlements] = useState<BusinessEntitlements | null>(null);
  const [entitlementsLoading, setEntitlementsLoading] = useState(true);
  const [entitlementsError, setEntitlementsError] = useState("");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [suspended, setSuspended] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [dark, setDark] = useState(getInitialDark);

  const effectiveNav = useMemo(() => {
    if (suspended || verificationPending) {
      return nav.filter((n) => n.to === "/dashboard" || n.to === "/dashboard/support");
    }
    if (entitlementsLoading) return nav;
    const f = entitlements?.features;
    return nav.filter((n) => !n.feature || f?.[n.feature] === true);
  }, [entitlements?.features, entitlementsLoading, suspended, verificationPending]);

  const refreshEntitlements = async () => {
    if (!business?._id) return;
    setEntitlementsLoading(true);
    setEntitlementsError("");
    try {
      const res = await businessApi.getEntitlements(business._id);
      if (res.success && res.data) {
        setEntitlements(res.data);
      } else {
        setEntitlements(null);
        setEntitlementsError(res.message || "Failed to load entitlements");
      }
    } catch (err: any) {
      setEntitlements(null);
      setEntitlementsError(err?.message || "Failed to load entitlements");
    } finally {
      setEntitlementsLoading(false);
    }
  };

  // On refresh/back (POP), if we land on /dashboard, restore last visited dashboard sub-page.
  useEffect(() => {
    if (navigationType !== "POP") return;
    if (location.pathname !== "/dashboard") return;

    try {
      const last = localStorage.getItem(DASH_LAST_PATH_KEY);
      if (!last) return;
      if (last === "/dashboard") return;
      if (!last.startsWith("/dashboard/")) return;
      navigate(last, { replace: true });
    } catch {
      // ignore
    }
  }, [location.pathname, navigate, navigationType]);

  // Persist the current dashboard sub-route so refresh can restore it.
  useEffect(() => {
    if (!location.pathname.startsWith("/dashboard")) return;
    const fullPath = `${location.pathname}${location.search || ""}`;
    try {
      localStorage.setItem(DASH_LAST_PATH_KEY, fullPath);
    } catch {
      // ignore
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setCheckingAccess(true);
        const res = await businessApi.getMyBusinesses({ force: true });
        const businesses = res.success && res.data ? res.data : [];
        const business = businesses[0];

        if (!business) {
          if (!cancelled) navigate("/onboarding", { replace: true, state: { resume: "create" } });
          return;
        }

        if (!cancelled) {
          setBusiness(business);
        }

        // If business is suspended by admin, enforce support-only mode immediately.
        if (!business.isActive) {
          if (!cancelled) {
            setSuspended(true);
            setVerificationPending(false);
            setEntitlements(null);
            setEntitlementsError("");
            setEntitlementsLoading(false);
            setCheckingAccess(false);
          }
          return;
        }

        // Unverified dukandar can access support only until admin verification.
        if (business.isVerified === false) {
          if (!cancelled) {
            setVerificationPending(true);
            setSuspended(false);
            setEntitlements(null);
            setEntitlementsError("");
            setEntitlementsLoading(false);
            setCheckingAccess(false);
          }
          return;
        }

        // Load effective entitlements (plan + overrides + fallback). Dashboard should work even on free/fallback.
        const ent = await businessApi.getEntitlements(business._id);
        if (!cancelled) {
          if (ent.success && ent.data) {
            setEntitlements(ent.data);
            setEntitlementsError("");
            setSuspended(false);
            setVerificationPending(false);
          } else {
            setEntitlements(null);
            setEntitlementsError(ent.message || "Failed to load entitlements");
          }
          setEntitlementsLoading(false);
          setCheckingAccess(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          const message = err?.message || "Failed to load plan access";
          const isSuspended = message.toLowerCase().includes("deactivated");
          if (isSuspended) {
            setSuspended(true);
            setVerificationPending(false);
            setEntitlementsError("");
          } else {
            setSuspended(false);
            setVerificationPending(false);
            setEntitlementsError(message);
          }
          setEntitlements(null);
          setEntitlementsLoading(false);
          setCheckingAccess(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!suspended && !verificationPending) return;
    const allowed = location.pathname === "/dashboard" || location.pathname === "/dashboard/support";
    if (!allowed) {
      navigate("/dashboard", { replace: true });
    }
  }, [suspended, verificationPending, location.pathname, navigate]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
      window.dispatchEvent(new Event("dukaansetu:theme"));
    } catch {
      // ignore
    }
  }, [dark]);

  const sidebarWidth = collapsed ? "w-[68px]" : "w-60";

  if (authLoading || checkingAccess) {
    return (
      <div className="min-h-screen bg-background">
        <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b z-40 flex items-center justify-between px-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>

        <div className="hidden lg:block fixed inset-y-0 left-0 w-60 bg-card border-r z-30">
          <div className="p-4 border-b">
            <Skeleton className="h-9 w-36" />
          </div>
          <div className="p-4 space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>

        <main className="pt-14 lg:pt-0 lg:pl-60">
          <div className="p-4 lg:px-8 lg:py-6 space-y-4">
            <Skeleton className="h-7 w-40" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  const entitlementsCtx = {
    entitlements,
    loading: entitlementsLoading,
    error: entitlementsError,
    suspended,
    refresh: refreshEntitlements,
  };

  const supportOnlyMode = suspended || verificationPending;
  const showSuspendedNotice = suspended && location.pathname === "/dashboard";
  const showVerificationNotice = verificationPending && location.pathname === "/dashboard";
  const supportOnlyBlockedRoute = supportOnlyMode && location.pathname !== "/dashboard" && location.pathname !== "/dashboard/support";
  const shouldRenderOutlet = !supportOnlyMode || location.pathname === "/dashboard/support";

  return (
    <EntitlementsContext.Provider value={entitlementsCtx}>
    <div className="min-h-screen bg-background flex w-full overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col ${sidebarWidth} bg-card border-r fixed inset-y-0 z-30 transition-all duration-300`}>
        <div className="p-4 border-b flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 overflow-hidden">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-primary-foreground" />
            </div>
            {!collapsed && <span className="font-bold text-foreground whitespace-nowrap">DukaanSetu</span>}
          </Link>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0">
            {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {effectiveNav.map(n => (
            <Link key={n.to} to={n.to}
              title={collapsed ? n.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname === n.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                } ${collapsed ? "justify-center px-0" : ""}`}>
              <n.icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{n.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t space-y-0.5">
          <button onClick={() => setDark(!dark)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors ${collapsed ? "justify-center px-0" : ""}`}>
            {dark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {!collapsed && (dark ? "Light Mode" : "Dark Mode")}
          </button>
                  {business?.slug && entitlements?.features?.publicShopEnabled === true && !supportOnlyMode ? (
            <Link
              to={`/shop/${business.slug}`}
              target="_blank"
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted ${collapsed ? "justify-center px-0" : ""}`}
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              {!collapsed && "View Shop"}
            </Link>
          ) : (
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground opacity-50 ${collapsed ? "justify-center px-0" : ""}`}>
              <ExternalLink className="w-4 h-4 shrink-0" />
              {!collapsed && "View Shop"}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b z-40 flex items-center justify-between px-4">
        <button onClick={() => setOpen(true)}><Menu className="w-6 h-6" /></button>
        <span className="font-bold text-foreground">DukaanSetu</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setDark(!dark)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            {dark ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
          </button>
          {business?.slug && entitlements?.features?.publicShopEnabled === true && !supportOnlyMode ? (
            <Link
              to={`/shop/${business.slug}`}
              target="_blank"
              aria-label="View shop"
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-muted-foreground" />
            </Link>
          ) : (
            <span className="p-1.5 rounded-lg opacity-50" aria-label="View shop (loading)">
              <ExternalLink className="w-5 h-5 text-muted-foreground" />
            </span>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-y-0 left-0 w-72 bg-card z-50 lg:hidden flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <span className="font-bold">DukaanSetu</span>
                <button onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {effectiveNav.map(n => (
                  <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname === n.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                      }`}>
                    <n.icon className="w-[18px] h-[18px]" />
                    {n.label}
                  </Link>
                ))}
              </nav>
              <div className="p-3 border-t">
                <button onClick={() => setDark(!dark)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted">
                  {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {dark ? "Light Mode" : "Dark Mode"}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className={`flex-1 min-w-0 ${collapsed ? "lg:pl-[68px]" : "lg:pl-60"} pt-14 lg:pt-0 transition-all duration-300`}>
        <div className="p-4 lg:px-8 lg:py-6">
          {entitlementsError ? (
            <Card className="border mb-4">
              <CardHeader>
                <CardTitle>Plan access unavailable</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{entitlementsError}</p>
                <div className="flex gap-2">
                  <Button onClick={refreshEntitlements} disabled={entitlementsLoading}>Retry</Button>
                  <Button variant="outline" asChild>
                    <Link to="/dashboard/subscription">View plans</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
          {showSuspendedNotice || showVerificationNotice || supportOnlyBlockedRoute ? (
            <Card className="border mb-4 border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle>{suspended ? "Account Suspended" : "Verification Pending"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {suspended
                    ? "Aapka account currently suspended hai. Support team se contact karne ke liye niche diye gaye button ka use karein."
                    : "Admin verification pending hai. Verification hone tak aap sirf support team ko message kar sakte hain."}
                </p>
                <div className="flex gap-2">
                  <Button asChild>
                    <Link to="/dashboard/support">Go To Support</Link>
                  </Button>
                  {/* <Button variant="outline" asChild>
                    <Link to="/dashboard">Back To Dashboard Notice</Link>
                  </Button> */}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {shouldRenderOutlet ? <Outlet /> : null}
        </div>
      </main>
    </div>
    </EntitlementsContext.Provider>
  );
};

export default DashboardLayout;
