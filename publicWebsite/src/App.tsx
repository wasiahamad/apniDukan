import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { PlanProvider } from "@/context/PlanContext";
import { LocationProvider } from "@/hooks/useUserLocation";
import { getDashboardUrl } from "@/lib/dashboardUrl";
import { hasAuthSession, looksLikeCitySlug } from "@/lib/publicShopsApi";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import LocationGate from "@/components/LocationGate";
import AboutPage from "./pages/AboutPage";
import AccountPage from "./pages/AccountPage";
import AllShopsPage from "./pages/AllShopsPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import CityCategoryPage from "./pages/CityCategoryPage";
import CityPage from "./pages/CityPage";
import ContactPage from "./pages/ContactPage";
import CategoriesPage from "./pages/CategoriesPage";
import ForBusinessPage from "./pages/ForBusinessPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import GoogleOAuthLanding from "./pages/oauth/GoogleOAuthLanding";
import PricingPage from "./pages/PricingPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import ReferralProgramPage from "./pages/ReferralProgramPage";
import ShopPage from "./pages/ShopPage";
import TermsPage from "./pages/TermsPage";
import StoriesPage from "./pages/StoriesPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PlanProvider>
        <LocationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SubdomainShopRedirect />
              <ScrollToTop />
              <LocationGate />
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Index />} />
                  <Route path="plans" element={<PricingPage />} />
                  <Route path="pricing" element={<Navigate to="/plans" replace />} />
                  <Route path="for-business" element={<ForBusinessPage />} />
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="stories" element={<StoriesPage />} />
                  <Route path="referral-program" element={<ReferralProgramPage />} />
                  <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route path="categories" element={<CategoriesPage />} />
                  <Route path="shops" element={<AllShopsPage />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="signup" element={<SignupPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="account" element={<AccountPage />} />
                  </Route>
                  <Route path="shops/:category" element={<CityCategoryPage />} />
                  <Route path="dashboard/*" element={<DashboardRedirect />} />
                  <Route path="shop/:shopSlug" element={<ShopDetailGate><ShopPage /></ShopDetailGate>} />
                  <Route path="auth/google/callback" element={<GoogleOAuthLanding />} />
                  <Route path=":shopSlug" element={<ShopOrCityPage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LocationProvider>
      </PlanProvider>
    </AuthProvider>
  </QueryClientProvider>
);

function DashboardRedirect() {
  useEffect(() => {
    const root = getDashboardUrl().replace(/\/$/, "");
    const path = window.location.pathname;
    const suffix = path.replace(/^\/dashboard\/?/, "");
    const target = suffix ? `${root}/${suffix}` : root;
    window.location.replace(target);
  }, []);

  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function SubdomainShopRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hostname = String(window.location.hostname || "").toLowerCase();
    const suffix = ".publicdukan.com";
    if (!hostname.endsWith(suffix)) return;

    const sub = hostname.slice(0, -suffix.length);
    const shopSlug = (sub.split(".")[0] || "").trim();
    if (!shopSlug) return;

    // Reserved subdomains
    if (["www", "seller", "admin", "api"].includes(shopSlug)) return;

    // On shop subdomain we always resolve to the shop page.
    const targetPath = `/${shopSlug}`;
    if (location.pathname === targetPath) return;

    navigate(
      {
        pathname: targetPath,
        search: location.search,
        hash: location.hash,
      },
      { replace: true },
    );
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
}

function ShopDetailGate({ children }: { children: React.ReactElement }) {
  const location = useLocation();

  if (!hasAuthSession()) {
    return <Navigate to="/login" replace state={{ from: location, authRequired: true }} />;
  }

  return children;
}

// Smart resolver: check if param is a city slug or shop slug

function ShopOrCityPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const location = useLocation();
  const detectQuery = useQuery({
    queryKey: ["resolve-city-or-shop", shopSlug],
    queryFn: () => looksLikeCitySlug(shopSlug || ""),
    enabled: !!shopSlug,
  });

  if (detectQuery.isLoading) {
    return (
      <div className="container py-10 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <Skeleton className="h-[360px] w-full rounded-xl" />
          <Skeleton className="h-[360px] w-full rounded-xl" />
          <Skeleton className="h-[360px] w-full rounded-xl" />
          <Skeleton className="h-[360px] w-full rounded-xl" />
        </div>
      </div>
    );
  }
  if (detectQuery.data) return <CityPage />;
  if (!hasAuthSession()) {
    return <Navigate to="/login" replace state={{ from: location, authRequired: true }} />;
  }
  return <ShopPage />;
}

export default App;
