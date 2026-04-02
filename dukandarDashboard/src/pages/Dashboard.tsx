import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Eye, MessageCircle, Phone, Package, CheckCircle2, Clock, XCircle, TrendingUp, ExternalLink, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { businessApi, type Business } from "@/lib/api/index";
import { orderApi, type Order } from "@/lib/api/orders";
import { Skeleton } from "@/components/ui/skeleton";

const getLastNDaysOrderTrend = (orders: Order[], days: number) => {
  const byDate = new Map<string, number>();
  for (const order of orders) {
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    byDate.set(key, (byDate.get(key) || 0) + 1);
  }

  const out: Array<{ date: string; orders: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      orders: byDate.get(key) || 0,
    });
  }
  return out;
};

const getSubscriptionTimeline = (planExpiresAt?: string) => {
  if (!planExpiresAt) {
    return {
      hasExpiry: false,
      isExpired: false,
      daysRemaining: null as number | null,
    };
  }

  const expiresMs = new Date(planExpiresAt).getTime();
  if (!Number.isFinite(expiresMs)) {
    return {
      hasExpiry: false,
      isExpired: false,
      daysRemaining: null as number | null,
    };
  }

  const now = Date.now();
  const daysRemaining = Math.max(Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24)), 0);
  return {
    hasExpiry: true,
    isExpired: expiresMs <= now,
    daysRemaining,
  };
};

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const { entitlements } = useEntitlements();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [businessStats, setBusinessStats] = useState<any>(null);
  const [ordersSummary, setOrdersSummary] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  // Calculate trend data - must be before any early returns
  const trend7 = useMemo(() => getLastNDaysOrderTrend(orders, 7), [orders]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only run when authentication status changes

  useEffect(() => {
    if (!business?._id) return;
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, ordersRes, listRes] = await Promise.all([
          businessApi.getBusinessStats(business._id),
          orderApi.getMyOrdersSummary(),
          orderApi.getMyOrders(),
        ]);

        if (!cancelled) {
          if (statsRes.success) setBusinessStats(statsRes.data?.stats || null);
          if (ordersRes.success) setOrdersSummary(ordersRes.data || null);
          if (listRes.success && Array.isArray(listRes.data)) {
            const sorted = [...listRes.data].sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setOrders(sorted);
          }
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


  // Fallback UI: If business is still not loaded after loading=false, show a message
  if (!business && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">Business data not found. Please try reloading or contact support.</p>
        </div>
      </div>
    );
  }

  const totalOrders = ordersSummary?.totalOrders ?? orders.length;
  const delivered = ordersSummary?.delivered ?? orders.filter((o) => o.status === "delivered").length;
  const pending = ordersSummary?.pending ?? orders.filter((o) => o.status === "pending").length;
  const cancelledOrders = ordersSummary?.cancelled ?? orders.filter((o) => o.status === "cancelled").length;

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

  // Defensive: ensure always at least 2 elements
  const safeTrend7 = Array.isArray(trend7) && trend7.length >= 2 ? trend7 : [{ orders: 0 }, { orders: 0 }];
  const todayVsYesterday = [
    { name: "Yesterday", value: safeTrend7[safeTrend7.length - 2]?.orders || 0 },
    { name: "Today", value: safeTrend7[safeTrend7.length - 1]?.orders || 0 },
  ];

  const statsCards = [
    { icon: Eye, label: "Total Views", value: shopData.total_views, iconBg: "bg-primary/10", iconColor: "text-primary" },
    { icon: Package, label: "Total Listings", value: businessStats?.totalListings ?? business.stats.totalListings ?? 0, iconBg: "bg-primary/10", iconColor: "text-primary" },
    { icon: MessageCircle, label: "Inquiries", value: businessStats?.totalInquiries ?? business.stats.totalInquiries ?? 0, iconBg: "bg-accent/10", iconColor: "text-accent" },
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

  const subscriptionTimeline = getSubscriptionTimeline(business.planExpiresAt);

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

      {subscriptionTimeline.hasExpiry && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`${subscriptionTimeline.isExpired ? "bg-destructive/10 border-destructive/30" : "bg-primary/10 border-primary/30"} border rounded-2xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${subscriptionTimeline.isExpired ? "bg-destructive/15" : "bg-primary/15"}`}>
              <Clock className={`w-5 h-5 ${subscriptionTimeline.isExpired ? "text-destructive" : "text-primary"}`} />
            </div>
            <span className={`text-sm ${subscriptionTimeline.isExpired ? "text-destructive" : "text-foreground"}`}>
              {subscriptionTimeline.isExpired
                ? "Subscription expire ho chuki hai. Renewal tak public website par aapki shop hidden rahegi."
                : `Subscription ke ${subscriptionTimeline.daysRemaining} day remaining hain.`}
            </span>
          </div>
          <Link
            to="/dashboard/subscription"
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-background/80 border border-border hover:bg-background transition-colors"
          >
            Manage Subscription
          </Link>
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
          <h3 className="text-sm font-bold text-foreground mb-4">📈 Orders Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend7}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} width={35} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(220, 13%, 91%)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Line type="monotone" dataKey="orders" stroke="hsl(153, 73%, 43%)" strokeWidth={2.5} dot={false} />
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
        <h3 className="text-sm font-bold text-foreground mb-4">⚡ Orders: Today vs Yesterday</h3>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={todayVsYesterday}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(220, 10%, 46%)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(220, 13%, 91%)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
            <Bar dataKey="value" radius={[10, 10, 0, 0]}>
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
          {orders.slice(0, 5).map((o, i) => (
            <motion.div key={o._id} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{o.customer?.name || "Customer"}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {(o.items || []).map((it) => `${it.title}${it.quantity > 1 ? ` x${it.quantity}` : ""}`).join(", ") || "No items"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm text-foreground">₹{Number(o.total || 0).toLocaleString()}</p>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full inline-block mt-1 ${statusColors[o.status]}`}>
                  {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                </span>
              </div>
            </motion.div>
          ))}
          {orders.length === 0 && (
            <div className="bg-card rounded-2xl border border-border/60 p-4 text-sm text-muted-foreground">
              No recent orders yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
