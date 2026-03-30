import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Shops from "@/pages/Shops";
import CreateShop from "@/pages/CreateShop";
import ShopProfile from "@/pages/ShopProfile";
import Orders from "@/pages/Orders";
import Delivery from "@/pages/Delivery";
import Subscriptions from "@/pages/Subscriptions";
import Analytics from "@/pages/Analytics";
import Support from "@/pages/Support";
import AuditLogs from "@/pages/AuditLogs";
import Login from "@/pages/Login";
import Subdomains from "@/pages/Subdomains";
import Settings from "@/pages/Settings";
import WeeklyReports from "@/pages/WeeklyReports";
import Referrals from "@/pages/Referrals";
import BusinessTypes from "@/pages/BusinessTypes";
import Customers from "@/pages/Customers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/shops" element={<Shops />} />
        <Route path="/shops/new" element={<CreateShop />} />
        <Route path="/shops/:id" element={<ShopProfile />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/business-types" element={<BusinessTypes />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/delivery" element={<Delivery />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/subdomains" element={<Subdomains />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/weekly-reports" element={<WeeklyReports />} />
        <Route path="/support" element={<Support />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
