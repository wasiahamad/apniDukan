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
import { looksLikeCitySlug } from "@/lib/publicShopsApi";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AboutPage from "./pages/AboutPage";
import AccountPage from "./pages/AccountPage";
import AllShopsPage from "./pages/AllShopsPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import CityCategoryPage from "./pages/CityCategoryPage";
import CityPage from "./pages/CityPage";
import ContactPage from "./pages/ContactPage";
import ForBusinessPage from "./pages/ForBusinessPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PricingPage from "./pages/PricingPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import ShopPage from "./pages/ShopPage";
import TermsPage from "./pages/TermsPage";

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
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/plans" element={<PricingPage />} />
                  <Route path="/pricing" element={<Navigate to="/plans" replace />} />
                  <Route path="/for-business" element={<ForBusinessPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/shops" element={<AllShopsPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/account" element={<AccountPage />} />
                  </Route>
                  <Route path="/:city/:category" element={<CityCategoryPage />} />
                  <Route path="/dashboard/*" element={<DashboardRedirect />} />
                  <Route path="/:shopSlug" element={<ShopOrCityPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
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

// Smart resolver: check if param is a city slug or shop slug
import { useParams } from "react-router-dom";

function ShopOrCityPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
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
  return <ShopPage />;
}

export default App;
