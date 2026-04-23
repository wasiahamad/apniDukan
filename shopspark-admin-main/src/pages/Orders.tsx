import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download } from "lucide-react";
import { orderAdminApi, type Order, type OrderStatus } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const statusFilters: (OrderStatus | "all")[] = ["all", "pending", "confirmed", "delivered", "cancelled"];

export default function Orders() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await orderAdminApi.listOrders();
        if (cancelled) return;
        setOrders(res.success ? res.data || [] : []);
      } catch (err: any) {
        if (cancelled) return;
        toast({
          title: "Failed to load orders",
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
  }, [toast]);

  const itemsText = (o: Order) => (o.items || []).map((it) => `${it.title} x${it.quantity}`).join(", ");

  const normalizePhone = (input?: string) => (input || "").toString().replace(/[^0-9+]/g, "").trim();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchSearch =
        !q ||
        order.orderId.toLowerCase().includes(q) ||
        order.business?.name?.toLowerCase?.().includes(q) ||
        (order.customer?.name || "").toLowerCase().includes(q) ||
        (order.customer?.phone || "").toLowerCase().includes(q);

      const matchStatus = statusFilter === "all" || order.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const summaryByShop = useMemo(() => {
    type OrderSource = Order["source"];

    type CustomerAgg = { key: string; name: string; phone?: string; orders: number };
    type ShopAgg = {
      key: string;
      businessId: string | null;
      name: string;
      slug?: string;
      whatsapp?: string;
      orders: number;
      sources: Record<OrderSource, number>;
      customers: Map<string, CustomerAgg>;
    };

    const initSources = (): Record<OrderSource, number> => ({
      website: 0,
      whatsapp: 0,
      manual: 0,
    });

    const map = new Map<string, ShopAgg>();

    for (const o of filtered) {
      const businessId = (o.business?._id || o.businessId || null) as string | null;
      const shopKey = businessId || "unknown";

      if (!map.has(shopKey)) {
        const isUnknown = !businessId;
        map.set(shopKey, {
          key: shopKey,
          businessId,
          name: o.business?.name || (isUnknown ? "Unknown shop" : "Shop not found"),
          slug: o.business?.slug,
          whatsapp: o.business?.whatsapp,
          orders: 0,
          sources: initSources(),
          customers: new Map(),
        });
      }

      const row = map.get(shopKey)!;
      row.orders += 1;
      row.sources[o.source] = (row.sources[o.source] || 0) + 1;

      const phone = normalizePhone(o.customer?.phone);
      const name = (o.customer?.name || "Customer").toString().trim() || "Customer";
      const customerKey = phone || name.toLowerCase();
      const existing = row.customers.get(customerKey);
      if (existing) {
        existing.orders += 1;
      } else {
        row.customers.set(customerKey, {
          key: customerKey,
          name,
          phone: phone || undefined,
          orders: 1,
        });
      }
    }

    const out = Array.from(map.values()).map((s) => {
      const customers = Array.from(s.customers.values()).sort((a, b) => b.orders - a.orders);
      return {
        ...s,
        uniqueCustomers: customers.length,
        topCustomers: customers.slice(0, 5),
      };
    });

    out.sort((a, b) => b.orders - a.orders);
    return out;
  }, [filtered]);

  const handleUpdateStatus = async (orderMongoId: string, status: OrderStatus) => {
    try {
      setUpdatingId(orderMongoId);
      const res = await orderAdminApi.updateStatus(orderMongoId, status);
      if (!res.success || !res.data) {
        throw new Error(res.message || "Failed to update status");
      }

      setOrders((prev) => prev.map((o) => (o._id === orderMongoId ? res.data! : o)));
      toast({ title: "Order updated", description: `Status set to ${status}` });
    } catch (err: any) {
      toast({
        title: "Failed to update order",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const formatMoney = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} orders found</p>
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
      </div>

      {!loading && summaryByShop.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div>
              <h2 className="text-base font-semibold">Orders by Shop</h2>
              <p className="text-sm text-muted-foreground">Dukandar-wise orders, customers, and source breakdown</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Customers</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="hidden lg:table-cell">Top customers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryByShop.map((s) => (
                    <TableRow
                      key={s.key}
                      className={s.businessId ? "cursor-pointer hover:bg-muted/50" : undefined}
                      onClick={s.businessId ? () => navigate(`/orders/shop/${s.businessId}`) : undefined}
                    >
                      <TableCell className="text-sm">
                        <div className="space-y-0.5">
                          <div className={s.businessId ? "font-medium hover:underline" : "font-medium"}>{s.name}</div>
                          {s.slug ? (
                            <div className="text-[10px] text-muted-foreground">/{s.slug}</div>
                          ) : s.businessId ? (
                            <div className="text-[10px] text-muted-foreground">Business: {s.businessId}</div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{s.orders}</TableCell>
                      <TableCell className="text-sm">{s.uniqueCustomers}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">Website {s.sources.website}</Badge>
                          <Badge variant="outline" className="text-xs">WhatsApp {s.sources.whatsapp}</Badge>
                          <Badge variant="outline" className="text-xs">Manual {s.sources.manual}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {s.topCustomers.length === 0 ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (
                            s.topCustomers.map((c) => (
                              <Badge key={c.key} variant="secondary" className="text-xs">
                                {c.name}{c.phone ? ` · ${c.phone}` : ""} ({c.orders})
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {statusFilters.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All Status" : s.replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-56" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))
                  : null}

                {!loading && filtered.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-mono text-xs">
                      <div className="space-y-0.5">
                        <div>{order.orderId}</div>
                        <div className="text-[10px] text-muted-foreground">#{order.orderNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="space-y-0.5">
                        <div>{order.business?.name || "-"}</div>
                        {order.business?.slug && (
                          <div className="text-[10px] text-muted-foreground">/{order.business.slug}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{order.customer?.name || "Customer"}</p>
                        <p className="text-xs text-muted-foreground">{order.customer?.phone || "-"}</p>
                        {order.customer?.address && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{order.customer.address}</p>
                        )}
                        {order.customer?.note && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">Note: {order.customer.note}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm hidden md:table-cell">
                      <div className="space-y-1">
                        {order.items.map((it, idx) => (
                          <div key={`${it.title}-${idx}`} className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm truncate">{it.title}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {it.quantity} × {formatMoney(it.unitPrice)}
                              </div>
                            </div>
                            <div className="text-sm font-medium whitespace-nowrap">
                              {formatMoney(it.lineTotal)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      <div className="space-y-0.5">
                        <div>{formatMoney(order.total)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Subtotal {formatMoney(order.subtotal)}{order.deliveryCharges ? ` · Delivery ${formatMoney(order.deliveryCharges)}` : ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs capitalize">{order.source}</Badge>
                        {order.origin && order.origin !== 'unknown' ? (
                          <div className="text-[10px] text-muted-foreground capitalize">via {order.origin}</div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={order.status} />
                        <Select
                          value={order.status}
                          onValueChange={(v) => handleUpdateStatus(order._id, v as OrderStatus)}
                          disabled={updatingId === order._id}
                        >
                          <SelectTrigger className="h-8 w-[150px]">
                            <SelectValue placeholder="Change" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusFilters
                              .filter((s): s is OrderStatus => s !== "all")
                              .map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s.replace(/\b\w/g, (c) => c.toUpperCase())}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}

                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                      No orders found
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
