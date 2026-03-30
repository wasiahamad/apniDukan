import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { mockShops, mockOrders } from "@/lib/mock-data";

const weeklyData = [
  { week: "Week 1", orders: 42, revenue: 38500, newShops: 3 },
  { week: "Week 2", orders: 56, revenue: 52000, newShops: 5 },
  { week: "Week 3", orders: 48, revenue: 44200, newShops: 2 },
  { week: "Week 4", orders: 63, revenue: 61000, newShops: 4 },
];

const shopPerformance = mockShops.slice(0, 10).map((shop, i) => ({
  shopName: shop.businessName,
  city: shop.city,
  ordersThisWeek: [12, 8, 15, 6, 10, 3, 9, 7, 11, 5][i],
  ordersLastWeek: [10, 9, 12, 7, 8, 5, 6, 8, 9, 4][i],
  revenue: [5400, 9600, 12000, 4800, 7500, 1500, 6300, 5600, 8800, 3200][i],
  trend: (["up", "down", "up", "down", "up", "down", "up", "down", "up", "up"] as const)[i],
}));

export default function WeeklyReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly Shop Reports</h1>
          <p className="text-sm text-muted-foreground">Performance overview — Feb 2025</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export PDF</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export Excel</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Weekly Orders Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--card-foreground))" }} />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Weekly Revenue Trend (₹)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--card-foreground))" }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shop Performance — This Week</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Orders (This Week)</TableHead>
                <TableHead>Orders (Last Week)</TableHead>
                <TableHead>Revenue (₹)</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shopPerformance.map((sp, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-sm">{sp.shopName}</TableCell>
                  <TableCell className="text-sm">{sp.city}</TableCell>
                  <TableCell className="text-sm">{sp.ordersThisWeek}</TableCell>
                  <TableCell className="text-sm">{sp.ordersLastWeek}</TableCell>
                  <TableCell className="text-sm">₹{sp.revenue.toLocaleString()}</TableCell>
                  <TableCell>
                    {sp.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-primary" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
