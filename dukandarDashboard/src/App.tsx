import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useLayoutEffect, useMemo } from "react";
import i18n from "@/i18n";
import { getPreferredLanguage } from "@/lib/language";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import OTPVerification from "./pages/OTPVerification";
import ForgotPassword from "./pages/ForgotPassword";
import Onboarding from "./pages/Onboarding";
import PublicShop from "./pages/PublicShop";
import PublicListingDetail from "./pages/PublicListingDetail";
import ProductDetail from "./pages/ProductDetail";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import BusinessProfile from "./pages/BusinessProfile";
import Branding from "./pages/Branding";
import Products from "./pages/Products";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import LocationPage from "./pages/LocationPage";
import Analytics from "./pages/Analytics";
import Subscription from "./pages/Subscription";
import Support from "./pages/Support";
import SettingsPage from "./pages/SettingsPage";
import ShopOffers from "./pages/ShopOffers";
import StoriesPage from "./pages/Stories";
import Referrals from "./pages/Referrals";
import Orders from "./pages/Orders";
import Bookings from "./pages/Bookings";
import Ratings from "./pages/Ratings";
import RequireFeature from "./components/RequireFeature";
import { getHostnameLower, getShopSlugFromHostname, isSellerHostname } from "@/lib/host";

const queryClient = new QueryClient();

const THEME_STORAGE_KEY = "dukaansetu:theme";

const RouteThemeScope = () => {
  const location = useLocation();

  const apply = () => {
    const isDashboard = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/");

    if (!isDashboard) {
      document.documentElement.classList.remove("dark");
      return;
    }

    try {
      const theme = localStorage.getItem(THEME_STORAGE_KEY);
      document.documentElement.classList.toggle("dark", theme === "dark");
    } catch {
      // ignore
    }
  };

  // Ensure public pages never inherit dashboard theme (no flash on route change).
  useLayoutEffect(() => {
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Update immediately when dashboard theme toggles.
  useEffect(() => {
    const onThemeChanged = () => apply();
    window.addEventListener("dukaansetu:theme", onThemeChanged);
    window.addEventListener("storage", onThemeChanged);
    return () => {
      window.removeEventListener("dukaansetu:theme", onThemeChanged);
      window.removeEventListener("storage", onThemeChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
};

const LanguageScope = () => {
  useEffect(() => {
    const apply = () => {
      i18n.changeLanguage(getPreferredLanguage());
    };

    apply();
    window.addEventListener('dukaansetu:lang', apply);
    window.addEventListener('storage', apply);
    return () => {
      window.removeEventListener('dukaansetu:lang', apply);
      window.removeEventListener('storage', apply);
    };
  }, []);

  return null;
};

const PublicShopSubdomainRedirect = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!import.meta.env.PROD) return;

    const hostname = String(window.location.hostname || "").toLowerCase();
    const isSellerHost = hostname === "seller.publicdukan.com";
    if (!isSellerHost) return;

    const match = /^\/shop\/([^/?#]+)(?:\/.*)?$/.exec(location.pathname);
    const slug = (match?.[1] || "").trim();
    if (!slug) return;

    // Prevent accidental redirect loops for reserved subdomains.
    if (["www", "seller", "admin", "api"].includes(slug.toLowerCase())) return;

    const target = `https://${slug}.publicdukan.com`;
    window.location.replace(`${target}${location.search || ""}${location.hash || ""}`);
  }, [location.hash, location.pathname, location.search]);

  return null;
};

const SellerDashboardRoutes = () => (
  <>
    <PublicShopSubdomainRedirect />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/otp-verification" element={<OTPVerification />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Legacy route-based shop pages removed in production to avoid routing conflicts. */}
      {!import.meta.env.PROD ? (
        <>
          <Route path="/shop/:slug" element={<PublicShop />} />
          <Route path="/shop/:slug/listing/:listingId" element={<PublicListingDetail />} />
        </>
      ) : null}

      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="business-profile" element={<BusinessProfile />} />
        <Route
          path="branding"
          element={
            <RequireFeature feature="brandingEnabled" title="Branding is not enabled">
              <Branding />
            </RequireFeature>
          }
        />
        <Route path="listings" element={<Products />} />
        <Route path="listings/:listingId" element={<ProductDetail />} />
        <Route
          path="offers"
          element={
            <RequireFeature feature="offersEnabled" title="Offers are not enabled">
              <ShopOffers />
            </RequireFeature>
          }
        />
        <Route
          path="orders"
          element={
            <RequireFeature feature="ordersEnabled" title="Orders are not enabled">
              <Orders />
            </RequireFeature>
          }
        />
        <Route
          path="bookings"
          element={
            <RequireFeature feature="bookingEnabled" title="Bookings are not enabled">
              <Bookings />
            </RequireFeature>
          }
        />
        <Route
          path="stories"
          element={
            <RequireFeature feature="storiesEnabled" title="Stories are not enabled">
              <StoriesPage />
            </RequireFeature>
          }
        />
        <Route
          path="ratings"
          element={
            <RequireFeature feature="ratingsEnabled" title="Ratings are not enabled">
              <Ratings />
            </RequireFeature>
          }
        />
        <Route
          path="whatsapp"
          element={
            <RequireFeature feature="whatsappSettingsEnabled" title="WhatsApp settings are not enabled">
              <WhatsAppSettings />
            </RequireFeature>
          }
        />
        <Route
          path="location"
          element={
            <RequireFeature feature="locationEnabled" title="Location is not enabled">
              <LocationPage />
            </RequireFeature>
          }
        />
        <Route
          path="analytics"
          element={
            <RequireFeature feature="analyticsEnabled" title="Analytics is not enabled">
              <Analytics />
            </RequireFeature>
          }
        />
        <Route path="subscription" element={<Subscription />} />
        <Route path="invoices" element={<Navigate to="/dashboard/subscription?section=invoices" replace />} />
        <Route
          path="referrals"
          element={
            <RequireFeature feature="referralsEnabled" title="Referrals are not enabled">
              <Referrals />
            </RequireFeature>
          }
        />
        <Route path="support" element={<Support />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

const ShopSubdomainRoutes = ({ shopSlug }: { shopSlug: string }) => (
  <Routes>
    <Route path="/" element={<PublicShop shopSlug={shopSlug} />} />
    <Route path="/listing/:listingId" element={<PublicListingDetail shopSlug={shopSlug} />} />
    {/* If someone hits the old route on a shop subdomain, normalize back to root. */}
    <Route path="/shop/:slug/*" element={<Navigate to="/" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const AppInner = () => {
  const hostname = useMemo(() => getHostnameLower(), []);
  const shopSlug = useMemo(() => getShopSlugFromHostname(hostname), [hostname]);
  const isSellerHost = useMemo(() => isSellerHostname(hostname), [hostname]);

  // If this build is served on a shop subdomain, render the shop landing page at root.
  if (shopSlug) {
    return <ShopSubdomainRoutes shopSlug={shopSlug} />;
  }

  // Safety: if someone serves the dashboard app on a non-seller hostname, don't break.
  // Default to dashboard routes.
  if (!isSellerHost && import.meta.env.PROD) {
    return <SellerDashboardRoutes />;
  }

  return <SellerDashboardRoutes />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LanguageScope />
          <RouteThemeScope />
          <AppInner />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
