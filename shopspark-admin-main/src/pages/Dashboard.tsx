import { Store, ShoppingCart, IndianRupee, AlertTriangle, Clock, TrendingUp, Plus, BarChart3, Gift } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { mockOrders } from "@/lib/mock-data";
import { useQuery } from "@tanstack/react-query";
import { businessAdminApi, paymentsAdminApi, referralAdminApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const revenueByWeekFallback = [
  { week: "W1", revenue: 0 },
  { week: "W2", revenue: 0 },
  { week: "W3", revenue: 0 },
  { week: "W4", revenue: 0 },
];

const ordersByDay = [
  { day: "Mon", orders: 12 },
  { day: "Tue", orders: 18 },
  { day: "Wed", orders: 15 },
  { day: "Thu", orders: 22 },
  { day: "Fri", orders: 28 },
  { day: "Sat", orders: 35 },
  { day: "Sun", orders: 20 },
];

const shopsByCategory = [
  { name: "Grocery", value: 8 },
  { name: "Electronics", value: 5 },
  { name: "Fashion", value: 4 },
  { name: "Restaurant", value: 4 },
  { name: "Other", value: 3 },
];

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--card-foreground))",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const recentOrders = mockOrders.slice(0, 5);

  const revenueQuery = useQuery({
    queryKey: ["admin", "payments", "revenueSummary"],
    queryFn: async () => {
      const res = await paymentsAdminApi.getRevenueSummary();
      if (!res.success) throw new Error(res.message || 'Failed to load revenue summary');
      return res.data;
    },
  });

  const businessesQuery = useQuery({
    queryKey: ["admin", "business", "list", "dashboard"],
    queryFn: async () => {
      const res = await businessAdminApi.list({ page: 1, limit: 50 });
      if (!res.success) throw new Error(res.message || 'Failed to load businesses');
      return res.data?.businesses || [];
    },
  });

  const referralStatsQuery = useQuery({
    queryKey: ["admin", "referrals", "stats", "dashboard"],
    queryFn: async () => {
      const res = await referralAdminApi.getStats();
      if (!res.success) throw new Error(res.message || 'Failed to load referral stats');
      return res.data;
    },
  });

  const businesses = businessesQuery.data || [];

  const totalShops = businesses.length;
  const activeShops = businesses.filter((b) => b.isActive && b.isVerified).length;
  const inactiveShops = businesses.filter((b) => !b.isActive).length;

  const expiringSubscriptions = businesses.filter((b) => {
    if (!b.planExpiresAt) return false;
    const days = (new Date(b.planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 7;
  }).length;

  const dashboardStats = {
    totalShops,
    activeShops,
    inactiveShops,
    totalOrders: mockOrders.length,
    todaysOrders: 0,
    totalRevenue: revenueQuery.data?.totalRevenueAllTime ?? 0,
    expiringSubscriptions,
    pendingTickets: 0,
  };

  const revenueTrendText =
    revenueQuery.isLoading
      ? <Skeleton className="h-3 w-40" />
      : typeof revenueQuery.data?.trendPct === 'number'
        ? `${revenueQuery.data.trendPct >= 0 ? '+' : ''}${revenueQuery.data.trendPct}% vs previous 4 weeks`
        : undefined;

  const recentShops = businesses.slice(0, 5);

  const dynamicShopsByCategory = (() => {
    const counts = new Map<string, number>();
    for (const b of businesses) {
      const key = b.businessType?.name || 'Other';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const arr = Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
    arr.sort((a, b) => b.value - a.value);
    return arr.slice(0, 5);
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, Admin</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/shops")}>View Shops</Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/orders")}>View Orders</Button>
          <Button size="sm" onClick={() => navigate("/shops")}><Plus className="h-4 w-4 mr-1" />Add Shop</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Shops"
          value={businessesQuery.isLoading ? <Skeleton className="h-8 w-24" /> : dashboardStats.totalShops}
          icon={Store}
          trend={businessesQuery.isLoading ? <Skeleton className="h-3 w-24" /> : undefined}
          trendUp
        />
        <StatCard
          title="Active Shops"
          value={businessesQuery.isLoading ? <Skeleton className="h-8 w-20" /> : dashboardStats.activeShops}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Referrals"
          value={referralStatsQuery.isLoading ? <Skeleton className="h-8 w-20" /> : (referralStatsQuery.data?.totalReferrals ?? "—")}
          icon={Gift}
          trend={referralStatsQuery.isLoading ? <Skeleton className="h-3 w-24" /> : undefined}
          trendUp
        />
        <StatCard
          title="Total Revenue"
          value={revenueQuery.isLoading ? <Skeleton className="h-8 w-28" /> : `₹${dashboardStats.totalRevenue.toLocaleString()}`}
          icon={IndianRupee}
          trend={revenueTrendText}
          trendUp={(revenueQuery.data?.trendPct ?? 0) >= 0}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Inactive Shops"
          value={businessesQuery.isLoading ? <Skeleton className="h-8 w-16" /> : dashboardStats.inactiveShops}
          icon={AlertTriangle}
        />
        <StatCard
          title="Pending Reward Requests"
          value={referralStatsQuery.isLoading ? <Skeleton className="h-8 w-16" /> : (referralStatsQuery.data?.pendingRequests ?? "—")}
          icon={Clock}
        />
        <StatCard
          title="Expiring Subs"
          value={businessesQuery.isLoading ? <Skeleton className="h-8 w-16" /> : dashboardStats.expiringSubscriptions}
          icon={AlertTriangle}
        />
        <StatCard title="Pending Tickets" value={dashboardStats.pendingTickets} icon={AlertTriangle} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Orders This Week</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ordersByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Trend (₹)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revenueQuery.data?.revenueByWeek || revenueByWeekFallback}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Shops by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dynamicShopsByCategory.length ? dynamicShopsByCategory : shopsByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {(dynamicShopsByCategory.length ? dynamicShopsByCategory : shopsByCategory).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell className="text-sm">{order.shopName}</TableCell>
                    <TableCell className="text-sm">₹{order.amount}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Shops</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/shops")}>View All</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentShops.map(shop => (
                <TableRow key={shop._id}>
                  <TableCell className="text-sm font-medium">{shop.name}</TableCell>
                  <TableCell className="text-sm">{shop.address?.city || '—'}</TableCell>
                  <TableCell className="text-sm">{shop.plan?.name || '—'}</TableCell>
                  <TableCell><StatusBadge status={!shop.isActive ? 'inactive' : !shop.isVerified ? 'suspended' : 'active'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
