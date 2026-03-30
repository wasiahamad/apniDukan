import { useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area } from "recharts";
import { generateDailyViews, deviceData, hourlyActivity, shopData } from "@/data/mockData";

const dailyViews = generateDailyViews();

const funnelData = [
  { name: "Views", value: shopData.total_views, fill: "hsl(153, 73%, 43%)" },
  { name: "WhatsApp", value: shopData.whatsapp_clicks, fill: "hsl(153, 73%, 55%)" },
  { name: "Calls", value: shopData.call_clicks, fill: "hsl(224, 76%, 53%)" },
  { name: "Map", value: shopData.map_clicks, fill: "hsl(33, 100%, 50%)" },
];

const Analytics = () => {
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const viewData = range === "7d" ? dailyViews.slice(-7) : dailyViews;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Analytics</h1>

      {/* Views Over Time */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Views Over Time</h3>
          <div className="flex bg-muted rounded-lg p-0.5">
            {(["7d", "30d"] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${range === r ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>
                {r === "7d" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={viewData}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={30} />
            <Tooltip />
            <Line type="monotone" dataKey="views" stroke="hsl(153, 73%, 43%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="whatsapp" stroke="hsl(33, 100%, 50%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Conversion Funnel */}
        <div className="bg-card border rounded-xl p-4">
          <h3 className="text-sm font-bold mb-3">Conversion Funnel</h3>
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

        {/* Device Distribution */}
        <div className="bg-card border rounded-xl p-4">
          <h3 className="text-sm font-bold mb-3">Device Distribution</h3>
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={deviceData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>
                  {deviceData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {deviceData.map(d => (
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
        <h3 className="text-sm font-bold mb-3">Peak Activity Time</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={hourlyActivity}>
            <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
            <YAxis tick={{ fontSize: 10 }} width={25} />
            <Tooltip />
            <Area type="monotone" dataKey="views" stroke="hsl(153, 73%, 43%)" fill="hsl(153, 73%, 43%)" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Analytics;
