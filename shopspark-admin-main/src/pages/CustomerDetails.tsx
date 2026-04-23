import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";

import { customersAdminApi, type AdminCustomerActivityItem, type AdminCustomerOrderBusinessRow } from "@/lib/api/customers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formatCoord = (value: number) => (Number.isFinite(value) ? value.toFixed(5) : "N/A");

const formatINR = (amount: number) => {
  const value = Number(amount || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

function ActivityTypeBadge({ type }: { type: AdminCustomerActivityItem["type"] }) {
  if (type === "order") return <Badge>Order</Badge>;
  if (type === "booking") return <Badge variant="secondary">Booking</Badge>;
  return <Badge variant="outline">Inquiry</Badge>;
}

function safeBusinessName(row: AdminCustomerOrderBusinessRow): string {
  return row.business?.name || "Unknown";
}

export default function CustomerDetails() {
  const params = useParams();
  const customerId = params.id || "";

  const detailsQuery = useQuery({
    queryKey: ["admin", "customers", customerId, "details"],
    enabled: Boolean(customerId),
    queryFn: async () => {
      const res = await customersAdminApi.getDetails(customerId, { limit: 25 });
      if (!res.success || !res.data) throw new Error(res.message || "Failed to load customer details");
      return res.data;
    },
  });

  const customer = detailsQuery.data?.customer;
  const bookingStats = detailsQuery.data?.bookingStats;
  const ordersSummary = detailsQuery.data?.ordersSummary;
  const activity = detailsQuery.data?.activity || [];

  const location = customer?.currentLocation;
  const coords = location?.coordinates;
  const lat = Array.isArray(coords) && coords.length >= 2 ? Number(coords[1]) : null;
  const lng = Array.isArray(coords) && coords.length >= 2 ? Number(coords[0]) : null;
  const hasMap = Number.isFinite(lat) && Number.isFinite(lng);
  const mapUrl = hasMap ? `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed` : null;

  const ordersByBusiness = useMemo(() => {
    const rows = ordersSummary?.byBusiness || [];
    return Array.isArray(rows) ? rows : [];
  }, [ordersSummary]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/customers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customer Details</h1>
            <p className="text-sm text-muted-foreground">{customerId}</p>
          </div>
        </div>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {detailsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-4 w-80" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : detailsQuery.isError || !customer ? (
            <p className="text-sm text-destructive">{(detailsQuery.error as Error)?.message || "Failed to load customer"}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{customer.name || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Contact</p>
                <p className="text-sm">{customer.email || "-"}</p>
                <p className="text-sm text-muted-foreground">{customer.phone || "No phone"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={customer.isActive === false ? "destructive" : "secondary"}>
                    {customer.isActive === false ? "Inactive" : "Active"}
                  </Badge>
                  <Badge variant={customer.isEmailVerified ? "default" : "outline"}>
                    {customer.isEmailVerified ? "Email Verified" : "Email Pending"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="text-sm">{customer.createdAt ? new Date(customer.createdAt).toLocaleString("en-IN") : "-"}</p>
                <p className="text-xs text-muted-foreground">Last login: {customer.lastLogin ? new Date(customer.lastLogin).toLocaleString("en-IN") : "-"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {detailsQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="space-y-1">
                <p className="text-2xl font-bold">{bookingStats?.totalBookings ?? 0}</p>
                <p className="text-xs text-muted-foreground">Active: {bookingStats?.activeBookings ?? 0} • Done: {bookingStats?.completedBookings ?? 0}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {detailsQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="space-y-1">
                <p className="text-2xl font-bold">{ordersSummary?.totalOrders ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total spent: {formatINR(ordersSummary?.totalSpent ?? 0)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Location</CardTitle>
          </CardHeader>
          <CardContent>
            {detailsQuery.isLoading ? (
              <Skeleton className="h-8 w-40" />
            ) : hasMap ? (
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-sm">
                  <MapPin className="h-4 w-4" />
                  {formatCoord(lat as number)}, {formatCoord(lng as number)}
                </p>
                <p className="text-xs text-muted-foreground">Synced: {location?.capturedAt ? new Date(location.capturedAt).toLocaleString("en-IN") : "-"}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not set</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Customer Location Map</CardTitle>
        </CardHeader>
        <CardContent>
          {detailsQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : mapUrl ? (
            <div className="space-y-2">
              <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border">
                <iframe title="Customer location" src={mapUrl} className="h-full w-full" loading="lazy" />
              </div>
              <div className="text-xs text-muted-foreground">
                Accuracy: {location?.accuracy ? `${location.accuracy}m` : "-"}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No location synced for this customer yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Orders by Shop */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Orders by Dukandar (Shop)</CardTitle>
        </CardHeader>
        <CardContent>
          {detailsQuery.isLoading ? (
            <Skeleton className="h-44 w-full" />
          ) : ordersByBusiness.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders found for this customer.</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead>Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersByBusiness.map((row, idx) => (
                    <TableRow key={`${row.business?._id || "unknown"}-${idx}`}>
                      <TableCell className="font-medium">{safeBusinessName(row)}</TableCell>
                      <TableCell className="text-right">{row.orderCount ?? 0}</TableCell>
                      <TableCell className="text-right">{formatINR(row.totalSpent ?? 0)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleString("en-IN") : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What the customer is doing (Recent Activity)</CardTitle>
        </CardHeader>
        <CardContent>
          {detailsQuery.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity found.</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.map((item, idx) => (
                    <TableRow key={`${item.refId || idx}`}> 
                      <TableCell className="text-xs text-muted-foreground">
                        {item.at ? new Date(item.at).toLocaleString("en-IN") : "-"}
                      </TableCell>
                      <TableCell>
                        <ActivityTypeBadge type={item.type} />
                      </TableCell>
                      <TableCell className="text-sm">{item.title || "-"}</TableCell>
                      <TableCell className="text-sm">{item.business?.name || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.status || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
