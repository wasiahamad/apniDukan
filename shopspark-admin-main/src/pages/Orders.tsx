import { useEffect, useMemo, useState } from "react";
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
                      <Badge variant="outline" className="text-xs capitalize">{order.source}</Badge>
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
