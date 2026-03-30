import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LocationProvider } from "@/hooks/useUserLocation";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import CityPage from "./pages/CityPage";
import CityCategoryPage from "./pages/CityCategoryPage";
import ShopPage from "./pages/ShopPage";
import PricingPage from "./pages/PricingPage";
import ForBusinessPage from "./pages/ForBusinessPage";
import ContactPage from "./pages/ContactPage";
import AboutPage from "./pages/AboutPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import NotFound from "./pages/NotFound";
import AllShopsPage from "./pages/AllShopsPage";
import AccountPage from "./pages/AccountPage";
import { looksLikeCitySlug } from "@/lib/publicShopsApi";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardUrl } from "@/lib/dashboardUrl";

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
    <LocationProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/for-business" element={<ForBusinessPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/shops" element={<AllShopsPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/:city/:category" element={<CityCategoryPage />} />
            <Route path="/dashboard/*" element={<DashboardRedirect />} />
            <Route path="/:shopSlug" element={<ShopOrCityPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </LocationProvider>
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
