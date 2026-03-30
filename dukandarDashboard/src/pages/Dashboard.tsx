import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, MessageCircle, Phone, MapPin, Package, CheckCircle2, Clock, XCircle, TrendingUp, ExternalLink, AlertCircle } from "lucide-react";
import { mockOrders, generateDailyViews } from "@/data/mockData";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { businessApi, type Business } from "@/lib/api/index";
import { orderApi } from "@/lib/api/orders";
import { Skeleton } from "@/components/ui/skeleton";

const dailyViews = generateDailyViews();
const last7 = dailyViews.slice(-7);

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const { entitlements } = useEntitlements();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [businessStats, setBusinessStats] = useState<any>(null);
  const [ordersSummary, setOrdersSummary] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Only fetch if we don't have business data yet
    if (business) {
      setLoading(false);
      return;
    }

    const fetchBusiness = async () => {
      try {
        const response = await businessApi.getMyBusinesses({ force: true });
        if (response.success && response.data && response.data.length > 0) {
          setBusiness(response.data[0]);
        } else {
          // No business found, redirect to onboarding
          navigate("/onboarding");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch business data");
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [isAuthenticated]); // Removed navigate from dependencies - it's stable

  useEffect(() => {
    if (!business?._id) return;
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          businessApi.getBusinessStats(business._id),
          orderApi.getMyOrdersSummary(),
        ]);

        if (!cancelled) {
          if (statsRes.success) setBusinessStats(statsRes.data?.stats || null);
          if (ordersRes.success) setOrdersSummary(ordersRes.data || null);
        }
      } catch {
        // ignore (dashboard can still render with partial data)
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [business?._id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return null;
  }

  const totalOrders = ordersSummary?.totalOrders ?? mockOrders.length;
  const delivered = ordersSummary?.delivered ?? mockOrders.filter(o => o.status === "delivered").length;
  const pending = ordersSummary?.pending ?? mockOrders.filter(o => o.status === "pending").length;
  const cancelledOrders = ordersSummary?.cancelled ?? mockOrders.filter(o => o.status === "cancelled").length;

  const shopData = {
    total_views: businessStats?.totalViews ?? business.stats.totalViews ?? 0,
    whatsapp_clicks: businessStats?.whatsappClicks ?? business.stats.whatsappClicks ?? 0,
    call_clicks: businessStats?.callClicks ?? business.stats.callClicks ?? 0,
    map_clicks: businessStats?.mapClicks ?? business.stats.mapClicks ?? 0,
  };

  const actionData = [
    { name: "WhatsApp", value: shopData.whatsapp_clicks, fill: "hsl(153, 73%, 43%)" },
    { name: "Calls", value: shopData.call_clicks, fill: "hsl(224, 76%, 53%)" },
    { name: "Map", value: shopData.map_clicks, fill: "hsl(33, 100%, 50%)" },
  ];

  const todayVsYesterday = [
    { name: "Yesterday", views: last7[last7.length - 2]?.views || 0 },
    { name: "Today", views: last7[last7.length - 1]?.views || 0 },
  ];

  const statsCards = [
    { icon: Eye, label: "Total Views", value: shopData.total_views, iconBg: "bg-primary/10", iconColor: "text-primary" },
    { icon: Package, label: "Total Listings", value: business.stats.totalListings, iconBg: "bg-primary/10", iconColor: "text-primary" },
    { icon: MessageCircle, label: "Inquiries", value: business.stats.totalInquiries, iconBg: "bg-accent/10", iconColor: "text-accent" },
    { icon: Phone, label: "Call Clicks", value: shopData.call_clicks, iconBg: "bg-secondary/10", iconColor: "text-secondary" },
  ];

  const orderStats = [
    { icon: Package, label: "Total Orders", value: totalOrders, iconBg: "bg-primary/10", iconColor: "text-primary" },
    { icon: CheckCircle2, label: "Delivered", value: delivered, iconBg: "bg-primary/10", iconColor: "text-primary" },
    { icon: Clock, label: "Pending", value: pending, iconBg: "bg-yellow-50", iconColor: "text-yellow-500" },
    { icon: XCircle, label: "Cancelled", value: cancelledOrders, iconBg: "bg-destructive/10", iconColor: "text-destructive" },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    confirmed: "bg-accent/10 text-accent border border-accent/20",
    delivered: "bg-primary/10 text-primary border border-primary/20",
    cancelled: "bg-destructive/10 text-destructive border border-destructive/20",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome, {user?.name} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {business.name} · {business.businessType?.name} · {business.plan?.name || "Free"} Plan
          </p>
        </div>
        {entitlements?.features?.publicShopEnabled === true && (
          <Link
            to={`/shop/${business.slug}`}
            target="_blank"
            className="hidden sm:flex items-center gap-2 text-sm font-semibold text-primary border border-primary/30 bg-primary/5 px-4 py-2.5 rounded-xl hover:bg-primary/10 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> View Shop
          </Link>
        )}
      </div>

      {/* Status Banner */}
      {!business.isVerified && (
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <span className="text-sm text-yellow-800">
            Your business is pending verification. You can start adding products now!
          </span>
        </motion.div>
      )}

      {/* Alert Banner */}
      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="bg-secondary/5 border border-secondary/20 rounded-2xl px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-secondary" />
        </div>
        <span className="text-sm text-foreground">
          Start adding products to make your shop visible to customers!
        </span>
      </motion.div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((s, i) => (
          <motion.div key={s.label} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.06 }}
            className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center mb-4`}>
              <s.icon className="w-5 h-5" style={{ strokeWidth: 1.8 }} />
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight">{s.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Order Stats */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">📦 Orders Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {orderStats.map((s, i) => (
            <motion.div key={s.label} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 + i * 0.06 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center mb-4`}>
                <s.icon className={`w-5 h-5 ${s.iconColor}`} style={{ strokeWidth: 1.8 }} />
              </div>
              <p className="text-3xl font-bold text-foreground tracking-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Views Trend */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}
          className="bg-card rounded-2xl border border-border/60 p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-bold text-foreground mb-4">📈 Views Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={last7}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} width={35} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(220, 13%, 91%)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Line type="monotone" dataKey="views" stroke="hsl(153, 73%, 43%)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Actions Breakdown */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl border border-border/60 p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-bold text-foreground mb-4">🎯 Customer Actions</h3>
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={actionData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={72} strokeWidth={3} stroke="hsl(0, 0%, 100%)">
                  {actionData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 pl-2">
              {actionData.map(d => (
                <div key={d.name} className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full" style={{ background: d.fill }} />
                  <span className="text-sm text-muted-foreground">{d.name}</span>
                  <span className="font-bold text-sm text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Today vs Yesterday */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}
        className="bg-card rounded-2xl border border-border/60 p-6 hover:shadow-md transition-shadow">
        <h3 className="text-sm font-bold text-foreground mb-4">⚡ Today vs Yesterday</h3>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={todayVsYesterday}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(220, 10%, 46%)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(220, 13%, 91%)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
            <Bar dataKey="views" radius={[10, 10, 0, 0]}>
              <Cell fill="hsl(220, 13%, 85%)" />
              <Cell fill="hsl(153, 73%, 43%)" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Recent Orders */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">🧾 Recent Orders</h2>
        <div className="space-y-3">
          {mockOrders.slice(0, 5).map((o, i) => (
            <motion.div key={o.order_id} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{o.customer_name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{o.items.join(", ")}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm text-foreground">₹{o.total}</p>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full inline-block mt-1 ${statusColors[o.status]}`}>
                  {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
