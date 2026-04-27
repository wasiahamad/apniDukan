import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, Outlet, useNavigate, useNavigationType } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, User, Palette, Package, MessageCircle, MapPin,
  BarChart3, CreditCard, Settings, Menu, X,
  ExternalLink, Sun, Moon, ChevronLeft, ChevronRight,
  ShoppingCart, Gift, CalendarClock, Star, Film, Languages
} from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { setPreferredLanguage, type AppLanguage } from "@/lib/language";
import { useAuth } from "@/contexts/AuthContext";
import { Business, businessApi } from "@/lib/api/index";
import { Skeleton } from "@/components/ui/skeleton";
import { EntitlementsContext, type BusinessEntitlements, type EntitlementFeatures } from "@/contexts/EntitlementsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const THEME_STORAGE_KEY = "dukaansetu:theme";
const DASH_LAST_PATH_KEY = "dukaansetu:dashboard:lastPath";
const PLATFORM_LOGO_SRC = "/logo-removebg-preview.png";

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

const nav: Array<{
  to: string;
  icon: any;
  labelKey: string;
  feature?: keyof EntitlementFeatures;
  isEnabled?: (features: EntitlementFeatures | undefined) => boolean;
}> = [
  { to: "/dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { to: "/dashboard/business-profile", icon: User, labelKey: "nav.businessProfile" },
  { to: "/dashboard/branding", icon: Palette, labelKey: "nav.branding", feature: "brandingEnabled" },
  { to: "/dashboard/listings", icon: Package, labelKey: "nav.listings", isEnabled: (f) => (f?.maxListings ?? 0) !== 0 },
  { to: "/dashboard/offers", icon: Gift, labelKey: "nav.offers", feature: "offersEnabled" },
  { to: "/dashboard/bookings", icon: CalendarClock, labelKey: "nav.bookings", feature: "bookingEnabled" },
  { to: "/dashboard/stories", icon: Film, labelKey: "nav.stories", feature: "storiesEnabled" },
  { to: "/dashboard/ratings", icon: Star, labelKey: "nav.ratings", feature: "ratingsEnabled" },
  { to: "/dashboard/orders", icon: ShoppingCart, labelKey: "nav.orders", feature: "ordersEnabled" },
  { to: "/dashboard/whatsapp", icon: MessageCircle, labelKey: "nav.whatsapp", feature: "whatsappSettingsEnabled" },
  { to: "/dashboard/location", icon: MapPin, labelKey: "nav.location", feature: "locationEnabled" },
  { to: "/dashboard/analytics", icon: BarChart3, labelKey: "nav.analytics", feature: "analyticsEnabled" },
  { to: "/dashboard/subscription", icon: CreditCard, labelKey: "nav.subscription" },
  { to: "/dashboard/referrals", icon: Gift, labelKey: "nav.referrals", feature: "referralsEnabled" },
  { to: "/dashboard/settings", icon: Settings, labelKey: "nav.settings" },
];

const DashboardLayout = () => {
  const { t } = useTranslation();
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
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [subscriptionDaysRemaining, setSubscriptionDaysRemaining] = useState<number | null>(null);
  const [dark, setDark] = useState(getInitialDark);

  const effectiveNav = useMemo(() => {
    if (suspended || verificationPending) {
      return nav.filter((n) => n.to === "/dashboard" || n.to === "/dashboard/settings");
    }
    if (subscriptionExpired) {
      return nav.filter((n) => n.to === "/dashboard" || n.to === "/dashboard/subscription" || n.to === "/dashboard/settings");
    }
    if (entitlementsLoading) return nav;
    const f = entitlements?.features;
    return nav.filter((n) => {
      if (n.feature && f?.[n.feature] !== true) return false;
      if (n.isEnabled && !n.isEnabled(f)) return false;
      return true;
    });
  }, [entitlements?.features, entitlementsLoading, suspended, verificationPending, subscriptionExpired]);

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
            setSubscriptionExpired(false);
            setSubscriptionDaysRemaining(null);
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
            setSubscriptionExpired(false);
            setSubscriptionDaysRemaining(null);
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
          const now = Date.now();
          const expiresAtMs = business.planExpiresAt ? new Date(business.planExpiresAt).getTime() : NaN;
          const hasExpiry = Number.isFinite(expiresAtMs);
          const isExpired = hasExpiry && expiresAtMs <= now;
          const daysRemaining = hasExpiry ? Math.max(Math.ceil((expiresAtMs - now) / (1000 * 60 * 60 * 24)), 0) : null;

          if (ent.success && ent.data) {
            setEntitlements(ent.data);
            setEntitlementsError("");
            setSuspended(false);
            setVerificationPending(false);
            setSubscriptionExpired(isExpired);
            setSubscriptionDaysRemaining(daysRemaining);
          } else {
            setEntitlements(null);
            setEntitlementsError(ent.message || "Failed to load entitlements");
            setSubscriptionExpired(isExpired);
            setSubscriptionDaysRemaining(daysRemaining);
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
            setSubscriptionExpired(false);
            setSubscriptionDaysRemaining(null);
            setEntitlementsError("");
          } else {
            setSuspended(false);
            setVerificationPending(false);
            setSubscriptionExpired(false);
            setSubscriptionDaysRemaining(null);
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
    if (!suspended && !verificationPending && !subscriptionExpired) return;

    const allowedPaths = ["/dashboard", "/dashboard/support"];
    if (subscriptionExpired && !suspended && !verificationPending) {
      allowedPaths.push("/dashboard/subscription");
    }

    const allowed = allowedPaths.includes(location.pathname);
    if (!allowed) {
      navigate("/dashboard", { replace: true });
    }
  }, [suspended, verificationPending, subscriptionExpired, location.pathname, navigate]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
      window.dispatchEvent(new Event("dukaansetu:theme"));
    } catch {
      // ignore
    }
  }, [dark]);

  const setLanguage = (lang: AppLanguage) => {
    setPreferredLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const sidebarWidth = collapsed ? "w-[68px]" : "w-60";

  // Always provide a stable context value shape
  const entitlementsCtx = useMemo(() => ({
    entitlements: entitlements ?? null,
    loading: !!entitlementsLoading,
    error: entitlementsError ?? "",
    suspended: !!suspended,
    refresh: refreshEntitlements,
  }), [entitlements, entitlementsLoading, entitlementsError, suspended]);

  const supportOnlyMode = suspended || verificationPending || subscriptionExpired;
  const showSuspendedNotice = suspended && location.pathname === "/dashboard";
  const showVerificationNotice = verificationPending && location.pathname === "/dashboard";
  const showSubscriptionExpiredNotice = subscriptionExpired && location.pathname === "/dashboard";
  const supportOnlyBlockedRoute = supportOnlyMode && !["/dashboard", "/dashboard/subscription", "/dashboard/settings"].includes(location.pathname);

  const subscriptionDaysSuffix = typeof subscriptionDaysRemaining === "number"
    ? t('notices.subscriptionExpiredDaysSuffix', { count: subscriptionDaysRemaining })
    : "";

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

  return (
    <EntitlementsContext.Provider value={entitlementsCtx}>
    <div className="min-h-screen bg-background flex w-full overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col ${sidebarWidth} bg-card border-r fixed inset-y-0 z-30 transition-all duration-300`}>
        <div className="p-4 border-b flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              <img src={PLATFORM_LOGO_SRC} alt={t('app.name')} className="w-7 h-7 object-contain" />
            </div>
            {!collapsed && <span className="font-bold text-foreground whitespace-nowrap">{t('app.name')}</span>}
          </Link>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0">
            {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {effectiveNav.map(n => (
            <Link key={n.to} to={n.to}
              title={collapsed ? t(n.labelKey) : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname === n.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                } ${collapsed ? "justify-center px-0" : ""}`}>
              <n.icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{t(n.labelKey)}</span>}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t space-y-0.5">
          <button onClick={() => setDark(!dark)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors ${collapsed ? "justify-center px-0" : ""}`}>
            {dark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {!collapsed && (dark ? t('common.lightMode') : t('common.darkMode'))}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors ${collapsed ? "justify-center px-0" : ""}`}
              >
                <Languages className="w-4 h-4 shrink-0" />
                {!collapsed && t('common.language')}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={() => setLanguage('en')}>{t('common.english')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('hi')}>{t('common.hindi')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {business?.slug && entitlements?.features?.publicShopEnabled === true && !supportOnlyMode ? (
            <a
              href={`https://${business.slug}.publicdukan.com`}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted ${collapsed ? "justify-center px-0" : ""}`}
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              {!collapsed && t('common.viewShop')}
            </a>
          ) : (
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground opacity-50 ${collapsed ? "justify-center px-0" : ""}`}>
              <ExternalLink className="w-4 h-4 shrink-0" />
              {!collapsed && t('common.viewShop')}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b z-40 flex items-center justify-between px-4">
        <button onClick={() => setOpen(true)}><Menu className="w-6 h-6" /></button>
        <span className="font-bold text-foreground">{t('app.name')}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setDark(!dark)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            {dark ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
          </button>
          {business?.slug && entitlements?.features?.publicShopEnabled === true && !supportOnlyMode ? (
            <a
              href={`https://${business.slug}.publicdukan.com`}
              target="_blank"
              rel="noreferrer"
              aria-label="View shop"
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-muted-foreground" />
            </a>
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
                <span className="font-bold">{t('app.name')}</span>
                <button onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {effectiveNav.map(n => (
                  <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname === n.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                      }`}>
                    <n.icon className="w-[18px] h-[18px]" />
                    {t(n.labelKey)}
                  </Link>
                ))}
              </nav>
              <div className="p-3 border-t">
                <button onClick={() => setDark(!dark)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted">
                  {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {dark ? t('common.lightMode') : t('common.darkMode')}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted">
                      <Languages className="w-4 h-4" />
                      {t('common.language')}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem onClick={() => setLanguage('en')}>{t('common.english')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLanguage('hi')}>{t('common.hindi')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                <CardTitle>{t('errors.planAccessUnavailable')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{entitlementsError}</p>
                <div className="flex gap-2">
                  <Button onClick={refreshEntitlements} disabled={entitlementsLoading}>{t('common.retry')}</Button>
                  <Button variant="outline" asChild>
                    <Link to="/dashboard/subscription">{t('common.viewPlans')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
          {showSuspendedNotice || showVerificationNotice || showSubscriptionExpiredNotice || supportOnlyBlockedRoute ? (
            <Card className="border mb-4 border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle>
                  {suspended
                    ? t('notices.accountSuspended')
                    : verificationPending
                      ? t('notices.verificationPending')
                      : t('notices.subscriptionExpired')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {suspended
                    ? t('notices.accountSuspendedDesc')
                    : verificationPending
                      ? t('notices.verificationPendingDesc')
                      : `${t('notices.subscriptionExpiredDesc')}${subscriptionDaysSuffix}`}
                </p>
                <div className="flex gap-2">
                  {subscriptionExpired ? (
                    <>
                      <Button asChild>
                        <Link to="/dashboard/subscription">{t('common.renewSubscription')}</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link to="/dashboard/settings">{t('common.openSettings')}</Link>
                      </Button>
                    </>
                  ) : (
                    <Button asChild>
                      <Link to="/dashboard/settings">{t('common.goToSettings')}</Link>
                    </Button>
                  )}
                  {/* <Button variant="outline" asChild>
                    <Link to="/dashboard">Back To Dashboard Notice</Link>
                  </Button> */}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Always render Outlet, but show warning if support-only mode blocks access */}
          {supportOnlyBlockedRoute ? (
            <Card className="border mb-4 border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle>
                  {suspended
                    ? t('notices.accountSuspended')
                    : verificationPending
                      ? t('notices.verificationPending')
                      : t('notices.subscriptionExpired')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {suspended
                    ? t('notices.accountSuspendedDesc')
                    : verificationPending
                      ? t('notices.verificationPendingDesc')
                      : t('notices.blockedBySupportOnly')}
                </p>
                <div className="flex gap-2">
                  {subscriptionExpired ? (
                    <>
                      <Button asChild>
                        <Link to="/dashboard/subscription">{t('common.goToSubscription')}</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link to="/dashboard/settings">{t('common.openSettings')}</Link>
                      </Button>
                    </>
                  ) : (
                    <Button asChild>
                      <Link to="/dashboard/settings">{t('common.openSettings')}</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
          <Outlet />
        </div>
      </main>
    </div>
    </EntitlementsContext.Provider>
  );
};

export default DashboardLayout;
