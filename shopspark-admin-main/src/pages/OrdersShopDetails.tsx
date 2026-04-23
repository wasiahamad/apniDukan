import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { businessAdminApi, orderAdminApi, type Business, type Order, type OrderStatus } from "@/lib/api";

const statusList: OrderStatus[] = ["pending", "confirmed", "delivered", "cancelled"];

export default function OrdersShopDetails() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { businessId } = useParams();

  const [business, setBusiness] = useState<Business | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!businessId) {
        toast({ title: "Missing businessId", variant: "destructive" });
        return;
      }

      try {
        setLoading(true);

        const [bizRes, ordersRes] = await Promise.allSettled([
          businessAdminApi.getById(businessId),
          orderAdminApi.listOrders({ businessId }),
        ]);

        if (cancelled) return;

        if (ordersRes.status === "fulfilled") {
          setOrders(ordersRes.value.success ? ordersRes.value.data || [] : []);
        } else {
          throw ordersRes.reason;
        }

        if (bizRes.status === "fulfilled") {
          setBusiness(bizRes.value.success ? ((bizRes.value.data as any) || null) : null);
          if (!bizRes.value.success) {
            toast({
              title: "Shop not found",
              description: bizRes.value.message || "This shop may be deleted; showing orders if available.",
            });
          }
        } else {
          setBusiness(null);
          const msg = bizRes.reason?.message || "This shop may be deleted; showing orders if available.";
          toast({ title: "Shop not found", description: msg });
        }
      } catch (err: any) {
        if (cancelled) return;
        toast({
          title: "Failed to load shop orders",
          description: err?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessId, toast]);

  const formatMoney = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const summary = useMemo(() => {
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((acc, o) => acc + Number(o.total || 0), 0);

    const sources = orders.reduce(
      (acc, o) => {
        acc[o.source] = (acc[o.source] || 0) + 1;
        return acc;
      },
      { website: 0, whatsapp: 0, manual: 0 } as Record<Order["source"], number>
    );

    const byStatus = orders.reduce((acc, o) => {
      const s = o.status as OrderStatus;
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<OrderStatus, number>);

    const customerKeys = new Set<string>();
    for (const o of orders) {
      const phone = (o.customer?.phone || "").toString().trim();
      const name = (o.customer?.name || "Customer").toString().trim().toLowerCase();
      customerKeys.add(phone || name);
    }

    return {
      totalOrders,
      totalAmount,
      uniqueCustomers: Array.from(customerKeys).filter(Boolean).length,
      sources,
      byStatus,
    };
  }, [orders]);

  const customers = useMemo(() => {
    type Row = {
      key: string;
      name: string;
      phone?: string;
      ordersCount: number;
      totalAmount: number;
      lastOrderAt?: string;
    };

    const map = new Map<string, Row>();

    for (const o of orders) {
      const phone = (o.customer?.phone || "").toString().trim();
      const name = (o.customer?.name || "Customer").toString().trim() || "Customer";
      const key = phone || name.toLowerCase();
      if (!key) continue;

      const existing = map.get(key);
      if (existing) {
        existing.ordersCount += 1;
        existing.totalAmount += Number(o.total || 0);
        if (!existing.lastOrderAt || new Date(o.createdAt) > new Date(existing.lastOrderAt)) {
          existing.lastOrderAt = o.createdAt;
        }
      } else {
        map.set(key, {
          key,
          name,
          phone: phone || undefined,
          ordersCount: 1,
          totalAmount: Number(o.total || 0),
          lastOrderAt: o.createdAt,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.ordersCount - a.ordersCount);
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">
            {loading ? "Shop Orders" : business?.name || "Shop Orders"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "" : `${summary.totalOrders} orders · ${summary.uniqueCustomers} customers`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/orders")}>Back</Button>
          {businessId && (
            <Button variant="secondary" onClick={() => navigate(`/shops/${businessId}`)}>
              Open Shop Profile
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div>
            <h2 className="text-base font-semibold">Shop Details</h2>
            <p className="text-sm text-muted-foreground">Dukandar + shop info</p>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Shop</div>
                <div className="text-sm font-medium">{business?.name || "-"}</div>
                <div className="text-xs text-muted-foreground">/{business?.slug || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Phone</div>
                <div className="text-sm font-medium">{business?.phone || "-"}</div>
                <div className="text-xs text-muted-foreground">WhatsApp {business?.whatsapp || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Owner</div>
                <div className="text-sm font-medium">{business?.owner?.name || "-"}</div>
                <div className="text-xs text-muted-foreground">{business?.owner?.phone || business?.owner?.email || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Location</div>
                <div className="text-sm font-medium">{business?.address?.city || "-"}</div>
                <div className="text-xs text-muted-foreground">{business?.address?.state || "-"}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="text-sm text-muted-foreground">Total Orders</div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{summary.totalOrders}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="text-sm text-muted-foreground">Total Amount</div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? <Skeleton className="h-7 w-28" /> : <div className="text-2xl font-bold">{formatMoney(summary.totalAmount)}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="text-sm text-muted-foreground">Customers</div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{summary.uniqueCustomers}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="text-sm text-muted-foreground">Source</div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-7 w-40" />
            ) : (
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">Website {summary.sources.website}</Badge>
                <Badge variant="outline" className="text-xs">WhatsApp {summary.sources.whatsapp}</Badge>
                <Badge variant="outline" className="text-xs">Manual {summary.sources.manual}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!loading && (
        <Card>
          <CardHeader className="pb-3">
            <div>
              <h2 className="text-base font-semibold">Status Breakdown</h2>
              <p className="text-sm text-muted-foreground">Pending / Confirmed / Delivered / Cancelled</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {statusList.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs capitalize">
                  {s}: {summary.byStatus[s] || 0}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div>
            <h2 className="text-base font-semibold">Customers</h2>
            <p className="text-sm text-muted-foreground">Which customer ordered how many times</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Last Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))
                  : customers.map((c) => (
                      <TableRow key={c.key}>
                        <TableCell className="text-sm">
                          <div className="space-y-0.5">
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.phone || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{c.ordersCount}</TableCell>
                        <TableCell className="text-sm font-medium">{formatMoney(c.totalAmount)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                          {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString("en-IN") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}

                {!loading && customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="p-8 text-center text-sm text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div>
            <h2 className="text-base font-semibold">Orders</h2>
            <p className="text-sm text-muted-foreground">Which customer ordered what (items + amount + source)</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-56" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))
                  : orders.map((o) => (
                      <TableRow key={o._id}>
                        <TableCell className="font-mono text-xs">
                          <div className="space-y-0.5">
                            <div>{o.orderId}</div>
                            <div className="text-[10px] text-muted-foreground">#{o.orderNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium">{o.customer?.name || "Customer"}</div>
                            <div className="text-xs text-muted-foreground">{o.customer?.phone || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="space-y-1">
                            {(o.items || []).map((it, idx) => (
                              <div key={`${o._id}-${idx}`} className="text-sm">
                                <div className="truncate">{it.title}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {it.quantity} × {formatMoney(it.unitPrice)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{formatMoney(o.total)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{o.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs capitalize">{o.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                          {new Date(o.createdAt).toLocaleDateString("en-IN")}
                        </TableCell>
                      </TableRow>
                    ))}

                {!loading && orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                      No orders found for this shop
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
