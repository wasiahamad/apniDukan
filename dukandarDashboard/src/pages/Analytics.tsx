import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area } from "recharts";
import { businessApi, type Business } from "@/lib/api/index";
import { orderApi, type Order } from "@/lib/api/orders";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

const getLastNDays = (days: number) => {
  const out: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
};

const HOUR_TEMPLATE = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, "0")}:00`,
  views: 0,
}));

const Analytics = () => {
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [business, setBusiness] = useState<Business | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<{ totalViews: number; whatsappClicks: number; callClicks: number; mapClicks: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "hi" ? "hi-IN" : "en-IN";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const businessRes = await businessApi.getMyBusinesses();
        const selectedBusiness = businessRes.success && businessRes.data?.[0] ? businessRes.data[0] : null;
        if (!selectedBusiness) {
          if (!cancelled) {
            setBusiness(null);
            setOrders([]);
          }
          return;
        }

        const [statsRes, ordersRes] = await Promise.all([
          businessApi.getBusinessStats(selectedBusiness._id),
          orderApi.getMyOrders(),
        ]);

        if (cancelled) return;

        setBusiness(selectedBusiness);
        if (statsRes.success) {
          setStats({
            totalViews: Number(statsRes.data?.stats?.totalViews || selectedBusiness.stats?.totalViews || 0),
            whatsappClicks: Number(statsRes.data?.stats?.whatsappClicks || selectedBusiness.stats?.whatsappClicks || 0),
            callClicks: Number(statsRes.data?.stats?.callClicks || selectedBusiness.stats?.callClicks || 0),
            mapClicks: Number(statsRes.data?.stats?.mapClicks || selectedBusiness.stats?.mapClicks || 0),
          });
        } else {
          setStats({
            totalViews: Number(selectedBusiness.stats?.totalViews || 0),
            whatsappClicks: Number(selectedBusiness.stats?.whatsappClicks || 0),
            callClicks: Number(selectedBusiness.stats?.callClicks || 0),
            mapClicks: Number(selectedBusiness.stats?.mapClicks || 0),
          });
        }

        setOrders(ordersRes.success && Array.isArray(ordersRes.data) ? ordersRes.data : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const viewData = useMemo(() => {
    const days = range === "7d" ? 7 : 30;
    const dayKeys = getLastNDays(days);
    const counts = new Map<string, number>();

    for (const order of orders) {
      const key = new Date(order.createdAt).toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const totalOrders = Math.max(1, orders.length);
    const totalWhatsapp = Math.max(0, Number(stats?.whatsappClicks || 0));
    const totalCalls = Math.max(0, Number(stats?.callClicks || 0));

    return dayKeys.map((d) => {
      const key = d.toISOString().slice(0, 10);
      const dayOrders = counts.get(key) || 0;
      const ratio = dayOrders / totalOrders;
      return {
        date: d.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" }),
        views: dayOrders,
        whatsapp: Math.round(totalWhatsapp * ratio),
        calls: Math.round(totalCalls * ratio),
      };
    });
  }, [orders, range, stats, dateLocale]);

  const funnelData = useMemo(
    () => [
      { name: t("analytics.metrics.views"), value: Number(stats?.totalViews || 0), fill: "hsl(153, 73%, 43%)" },
      { name: t("analytics.metrics.whatsapp"), value: Number(stats?.whatsappClicks || 0), fill: "hsl(153, 73%, 55%)" },
      { name: t("analytics.metrics.calls"), value: Number(stats?.callClicks || 0), fill: "hsl(224, 76%, 53%)" },
      { name: t("analytics.metrics.map"), value: Number(stats?.mapClicks || 0), fill: "hsl(33, 100%, 50%)" },
    ],
    [stats, t]
  );

  const sourceData = useMemo(() => {
    const website = orders.filter((o) => o.source === "website").length;
    const whatsapp = orders.filter((o) => o.source === "whatsapp").length;
    const manual = orders.filter((o) => o.source === "manual").length;
    const total = Math.max(1, website + whatsapp + manual);

    return [
      { name: t("analytics.sources.website"), value: Math.round((website / total) * 100), fill: "hsl(153, 73%, 43%)" },
      { name: t("analytics.sources.whatsapp"), value: Math.round((whatsapp / total) * 100), fill: "hsl(224, 76%, 53%)" },
      { name: t("analytics.sources.manual"), value: Math.max(0, 100 - Math.round((website / total) * 100) - Math.round((whatsapp / total) * 100)), fill: "hsl(33, 100%, 50%)" },
    ];
  }, [orders, t]);

  const hourlyActivity = useMemo(() => {
    const data = HOUR_TEMPLATE.map((row) => ({ ...row }));
    for (const order of orders) {
      const hour = new Date(order.createdAt).getHours();
      if (Number.isFinite(hour) && hour >= 0 && hour < 24) {
        data[hour].views += 1;
      }
    }
    return data;
  }, [orders]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{t("analytics.title")}</h1>

      {/* Views Over Time */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">{t("analytics.viewsOverTime")}</h3>
          <div className="flex bg-muted rounded-lg p-0.5">
            {(["7d", "30d"] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${range === r ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>
                {r === "7d" ? t("analytics.range.7d") : t("analytics.range.30d")}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={viewData}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={30} />
            <Tooltip />
            <Line type="monotone" dataKey="views" name={t("analytics.metrics.orders")} stroke="hsl(153, 73%, 43%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="whatsapp" name={t("analytics.metrics.whatsappClicks")} stroke="hsl(33, 100%, 50%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Conversion Funnel */}
        <div className="bg-card border rounded-xl p-4">
          <h3 className="text-sm font-bold mb-3">{t("analytics.conversionFunnel")}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={funnelData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={65} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {funnelData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Source Distribution */}
        <div className="bg-card border rounded-xl p-4">
          <h3 className="text-sm font-bold mb-3">{t("analytics.orderSourceDistribution")}</h3>
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>
                  {sourceData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {sourceData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: d.fill }} />
                  <span className="text-sm text-muted-foreground">{d.name}</span>
                  <span className="font-bold text-sm">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Peak Activity */}
      <div className="bg-card border rounded-xl p-4">
        <h3 className="text-sm font-bold mb-3">{t("analytics.peakOrderTime")}</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={hourlyActivity}>
            <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
            <YAxis tick={{ fontSize: 10 }} width={25} />
            <Tooltip />
            <Area type="monotone" dataKey="views" stroke="hsl(153, 73%, 43%)" fill="hsl(153, 73%, 43%)" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {!business && (
        <div className="text-sm text-muted-foreground">{t("analytics.noBusiness")}</div>
      )}
    </div>
  );
};

export default Analytics;
