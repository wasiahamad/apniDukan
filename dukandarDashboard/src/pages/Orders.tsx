import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Package, Search, Eye, MessageCircle, Clock, CheckCircle2, XCircle, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { orderApi, type Order as ApiOrder, type OrderStatus } from "@/lib/api/orders";
import { useToast } from "@/hooks/use-toast";

const filters: (OrderStatus | "all")[] = ["all", "pending", "confirmed", "delivered", "cancelled"];

const normalizePhone = (value?: string) => (value || "").replace(/[^0-9]/g, "").trim();

const Orders = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const dateLocale = i18n.language === "hi" ? "hi-IN" : "en-IN";

  const statusConfig: Record<OrderStatus, { label: string; icon: typeof Clock; class: string }> = useMemo(
    () => ({
      pending: {
        label: t("orders.status.pending"),
        icon: Clock,
        class: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800",
      },
      confirmed: {
        label: t("orders.status.confirmed"),
        icon: CheckCircle2,
        class: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
      },
      delivered: {
        label: t("orders.status.delivered"),
        icon: Truck,
        class: "bg-primary/10 text-primary border-primary/20",
      },
      cancelled: {
        label: t("orders.status.cancelled"),
        icon: XCircle,
        class: "bg-destructive/10 text-destructive border-destructive/20",
      },
    }),
    [i18n.language, t]
  );

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [activeFilter, setActiveFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await orderApi.getMyOrders();
        if (cancelled) return;
        setOrders(res.success ? res.data || [] : []);
      } catch (err: any) {
        if (cancelled) return;
        toast({
          title: t("orders.toasts.loadFailedTitle"),
          description: err?.message || t("orders.toasts.loadFailedDesc"),
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (activeFilter !== "all" && o.status !== activeFilter) return false;

      if (q) {
        const customerName = (o.customer?.name || "").toLowerCase();
        const orderId = (o.orderId || "").toLowerCase();
        if (!customerName.includes(q) && !orderId.includes(q)) return false;
      }

      return true;
    });
  }, [activeFilter, orders, search]);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    delivered: orders.filter(o => o.status === "delivered").length,
    cancelled: orders.filter(o => o.status === "cancelled").length,
  };

  const setOrderInState = (updated: ApiOrder) => {
    setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
    setSelectedOrder((prev) => (prev?._id === updated._id ? updated : prev));
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      setUpdatingStatus(true);
      const res = await orderApi.updateStatus(orderId, status);
      if (!res.success || !res.data) {
        throw new Error(res.message || t("orders.toasts.updateFailedDesc"));
      }
      setOrderInState(res.data);
      toast({
        title: t("orders.toasts.updatedTitle"),
        description: t("orders.toasts.updatedDesc", { statusLabel: t(`orders.status.${status}`) }),
      });
    } catch (err: any) {
      toast({
        title: t("orders.toasts.updateFailedTitle"),
        description: err?.message || t("orders.toasts.updateFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("orders.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("orders.subtitle")}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { id: "totalOrders", label: t("orders.stats.totalOrders"), value: stats.total, icon: Package, color: "text-primary" },
          { id: "pending", label: t("orders.stats.pending"), value: stats.pending, icon: Clock, color: "text-amber-500" },
          { id: "delivered", label: t("orders.stats.delivered"), value: stats.delivered, icon: Truck, color: "text-primary" },
          { id: "cancelled", label: t("orders.stats.cancelled"), value: stats.cancelled, icon: XCircle, color: "text-destructive" },
        ].map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-muted ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("orders.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filters.map(f => (
            <Button key={f} size="sm" variant={activeFilter === f ? "default" : "outline"}
              onClick={() => setActiveFilter(f)} className="capitalize whitespace-nowrap text-xs">
              {f === "all" ? t("orders.filters.all") : t(`orders.filters.${f}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Order Cards */}
      <div className="space-y-3">
        {loading && (
          <Card className="border"><CardContent className="p-12 text-center text-muted-foreground">{t("orders.loading")}</CardContent></Card>
        )}

        {!loading && filtered.length === 0 && (
          <Card className="border"><CardContent className="p-12 text-center text-muted-foreground">{t("orders.empty")}</CardContent></Card>
        )}

        {!loading && filtered.map((order, i) => {
          const sc = statusConfig[order.status];
          const StatusIcon = sc.icon;
          const customerName = order.customer?.name || t("orders.customerFallback");
          const customerPhone = normalizePhone(order.customer?.phone);
          const itemText = (order.items || []).map((it) => `${it.title} x${it.quantity}`).join(", ");
          return (
            <motion.div key={order._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{order.orderId}</span>
                        <Badge variant="outline" className={`text-[11px] ${sc.class}`}>
                          <StatusIcon className="w-3 h-3 mr-1" /> {sc.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[11px] capitalize">
                          {order.source}{order.origin && order.origin !== 'unknown' ? ` · ${order.origin}` : ''}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{customerName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{itemText}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-foreground">₹{order.total}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedOrder(order)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {customerPhone ? (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" asChild>
                            <a href={`https://wa.me/${customerPhone}`} target="_blank" rel="noreferrer">
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8" disabled>
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedOrder ? t("orders.detailTitle", { orderId: selectedOrder.orderId }) : t("orders.title")}
              {selectedOrder && (
                <Badge variant="outline" className={statusConfig[selectedOrder.status].class}>
                  {statusConfig[selectedOrder.status].label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">{selectedOrder.customer?.name || t("orders.customerFallback")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("orders.whatsappLabel", { phone: selectedOrder.customer?.phone || "-" })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("orders.dateLabel", {
                    date: new Date(selectedOrder.createdAt).toLocaleDateString(dateLocale, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }),
                  })}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-foreground mb-2">{t("orders.updateStatus")}</p>
                <div className="flex flex-wrap gap-2">
                  {filters.filter((f) => f !== "all").map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={selectedOrder.status === s ? "default" : "outline"}
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus(selectedOrder._id, s as OrderStatus)}
                      className="capitalize"
                    >
                      {t(`orders.status.${s}`)}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-foreground mb-2">{t("orders.items")}</p>
                <ul className="space-y-1.5">
                  {selectedOrder.items.map((item, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {item.title} x{item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">{t("orders.total")}</span>
                <span className="text-lg font-bold text-primary">₹{selectedOrder.total}</span>
              </div>
              {normalizePhone(selectedOrder.customer?.phone) ? (
                <Button className="w-full" asChild>
                  <a
                    href={`https://wa.me/${normalizePhone(selectedOrder.customer?.phone)}?text=${encodeURIComponent(
                      t("orders.whatsappMessage", {
                        name: (selectedOrder.customer?.name || t("orders.customerFallback")).trim(),
                        orderId: selectedOrder.orderId,
                      })
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> {t("orders.messageWhatsApp")}
                  </a>
                </Button>
              ) : (
                <Button className="w-full" disabled>
                  <MessageCircle className="w-4 h-4 mr-2" /> {t("orders.noCustomerPhone")}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
