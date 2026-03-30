import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useLayoutEffect } from "react";
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
import Invoices from "./pages/Invoices";
import Support from "./pages/Support";
import SettingsPage from "./pages/SettingsPage";
import Referrals from "./pages/Referrals";
import Orders from "./pages/Orders";
import RequireFeature from "./components/RequireFeature";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RouteThemeScope />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/otp-verification" element={<OTPVerification />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/shop/:slug" element={<PublicShop />} />
            <Route path="/shop/:slug/listing/:listingId" element={<PublicListingDetail />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="business-profile" element={<BusinessProfile />} />
              <Route path="branding" element={<RequireFeature feature="brandingEnabled" title="Branding is not enabled"><Branding /></RequireFeature>} />
              <Route path="listings" element={<Products />} />
              <Route path="listings/:listingId" element={<ProductDetail />} />
              <Route path="orders" element={<RequireFeature feature="ordersEnabled" title="Orders are not enabled"><Orders /></RequireFeature>} />
              <Route path="whatsapp" element={<RequireFeature feature="whatsappSettingsEnabled" title="WhatsApp settings are not enabled"><WhatsAppSettings /></RequireFeature>} />
              <Route path="location" element={<LocationPage />} />
              <Route path="analytics" element={<RequireFeature feature="analyticsEnabled" title="Analytics is not enabled"><Analytics /></RequireFeature>} />
              <Route path="subscription" element={<Subscription />} />
              <Route path="invoices" element={<RequireFeature feature="invoicesEnabled" title="Invoices are not enabled"><Invoices /></RequireFeature>} />
              <Route path="referrals" element={<RequireFeature feature="referralsEnabled" title="Referrals are not enabled"><Referrals /></RequireFeature>} />
              <Route path="support" element={<Support />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
