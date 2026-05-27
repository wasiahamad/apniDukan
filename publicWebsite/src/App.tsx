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
import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import LocationGate from "@/components/LocationGate";
import AllShopsPage from "./pages/AllShopsPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import CategoriesPage from "./pages/CategoriesPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ShopPage from "./pages/ShopPage";
const AccountPage = lazy(() => import("./pages/AccountPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const ForBusinessPage = lazy(() => import("./pages/ForBusinessPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const ReferralProgramPage = lazy(() => import("./pages/ReferralProgramPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const StoriesPage = lazy(() => import("./pages/StoriesPage"));
const CityCategoryPage = lazy(() => import("./pages/CityCategoryPage"));
const CityPage = lazy(() => import("./pages/CityPage"));

const RouteFallback = () => (
  <div className="container py-10 space-y-3">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-10 w-full rounded-xl" />
    <Skeleton className="h-[320px] w-full rounded-xl" />
  </div>
);

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
                  <Route index element={<HomeResolver />} />
                  <Route
                    path="plans"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <PricingPage />
                      </Suspense>
                    }
                  />
                  <Route path="pricing" element={<Navigate to="/plans" replace />} />
                  <Route
                    path="for-business"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <ForBusinessPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="contact"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <ContactPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="about"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <AboutPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="stories"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <StoriesPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="referral-program"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <ReferralProgramPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="privacy-policy"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <PrivacyPolicyPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="terms"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <TermsPage />
                      </Suspense>
                    }
                  />
                  <Route path="categories" element={<CategoriesPage />} />
                  <Route path="shops" element={<AllShopsPage />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="signup" element={<SignupPage />} />
                  <Route
                    path="notifications"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <NotificationsPage />
                      </Suspense>
                    }
                  />
                  <Route element={<ProtectedRoute />}>
                    <Route
                      path="account"
                      element={
                        <Suspense fallback={<RouteFallback />}>
                          <AccountPage />
                        </Suspense>
                      }
                    />
                  </Route>
                  <Route
                    path="shops/:category"
                    element={
                      <Suspense fallback={<RouteFallback />}>
                        <CityCategoryPage />
                      </Suspense>
                    }
                  />
                  <Route path="dashboard/*" element={<DashboardRedirect />} />

                  {/* SEO-friendly shop subdomain URLs */}
                  <Route path="products/:listingSlug" element={<SubdomainListingRoute listingType="product" />} />
                  <Route path="services/:listingSlug" element={<SubdomainListingRoute listingType="service" />} />

                  <Route path="shop/:shopSlug" element={<ShopDetailGate><ShopPage /></ShopDetailGate>} />
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

    // Backward compatibility:
    // Previously subdomains forced `/${shopSlug}`. Now we keep clean URLs:
    //   /                    (shop home)
    //   /products/:slug
    //   /services/:slug
    const prefix = `/${shopSlug}`;
    if (location.pathname === prefix) {
      navigate({ pathname: '/', search: location.search, hash: location.hash }, { replace: true });
      return;
    }

    if (location.pathname.startsWith(`${prefix}/`)) {
      const rest = location.pathname.slice(prefix.length) || '/';
      navigate({ pathname: rest, search: location.search, hash: location.hash }, { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
}

function getShopSlugFromHostname() {
  if (typeof window === "undefined") return null;
  const hostname = String(window.location.hostname || "").toLowerCase();
  const suffix = ".publicdukan.com";
  if (!hostname.endsWith(suffix)) return null;
  const sub = hostname.slice(0, -suffix.length);
  const shopSlug = (sub.split(".")[0] || "").trim();
  if (!shopSlug) return null;
  if (["www", "seller", "admin", "api"].includes(shopSlug)) return null;
  return shopSlug;
}

function HomeResolver() {
  const shopSlug = getShopSlugFromHostname();
  if (shopSlug) {
    return <ShopPage shopSlugOverride={shopSlug} />;
  }
  return <Index />;
}

function SubdomainListingRoute({ listingType }: { listingType: 'product' | 'service' }) {
  const { listingSlug } = useParams<{ listingSlug: string }>();
  const shopSlug = getShopSlugFromHostname();
  if (!shopSlug) return <NotFound />;
  return <ShopPage shopSlugOverride={shopSlug} listingSlugOverride={listingSlug} listingTypeOverride={listingType} />;
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
  if (detectQuery.data) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <CityPage />
      </Suspense>
    );
  }
  if (!hasAuthSession()) {
    return <Navigate to="/login" replace state={{ from: location, authRequired: true }} />;
  }
  return <ShopPage />;
}

export default App;
