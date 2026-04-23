import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Download, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { businessApi, invoiceApi, planApi, type Business, type Invoice, type Plan } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";
import { loadRazorpayScript } from "@/lib/razorpay";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPlanFeatureSummary } from "@/lib/planFeatures";
import { useEntitlements } from "@/contexts/EntitlementsContext";

const statusColor: Record<string, string> = { paid: "bg-green-100 text-green-700" };

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
};

const inferBillingCycleFromDays = (days?: number): "monthly" | "quarterly" | "yearly" | null => {
  const d = Number(days);
  if (!Number.isFinite(d) || d <= 0) return null;
  if (d >= 360) return "yearly";
  if (d >= 85) return "quarterly";
  if (d >= 28 && d <= 31) return "monthly";
  return null;
};

const getPlanPeriodText = (t: (key: string, options?: any) => string, plan: Plan) => {
  if (!plan) return "";
  const cycle = plan.billingCycle || inferBillingCycleFromDays(plan.durationInDays);
  if (cycle === "monthly") return t("subscription.billing.month");
  if (cycle === "quarterly") return t("subscription.billing.quarterly");
  if (cycle === "yearly") return t("subscription.billing.year");
  if (plan.price <= 0) return t("subscription.billing.forever");
  return t("subscription.billing.days", { count: plan.durationInDays });
};

const Subscription = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { entitlements, loading: entitlementsLoading } = useEntitlements();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [recentInvoice, setRecentInvoice] = useState<Invoice | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [busyInvoiceId, setBusyInvoiceId] = useState<string | null>(null);

  const currentPlanId = useMemo(() => {
    const p = business?.plan;
    if (!p) return null;
    return typeof p === "string" ? p : p._id;
  }, [business?.plan]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [bizRes, plansRes] = await Promise.all([
          businessApi.getMyBusinesses(),
          planApi.getPlans(),
        ]);

        if (!cancelled) {
          if (bizRes.success && bizRes.data && bizRes.data.length > 0) {
            setBusiness(bizRes.data[0]);
          }
          if (plansRes.success && plansRes.data) {
            setPlans(plansRes.data);
          }
        }

        try {
          setInvoicesLoading(true);
          const invRes = await invoiceApi.listMyInvoices();
          if (!cancelled) {
            setInvoices(invRes.success && invRes.data ? invRes.data : []);
          }
        } catch (err: any) {
          if (!cancelled) {
            toast({
              variant: "destructive",
              title: t("subscription.toasts.errorTitle"),
              description: err.message || t("subscription.toasts.loadInvoicesFailed"),
            });
          }
        } finally {
          if (!cancelled) setInvoicesLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: t("subscription.toasts.errorTitle"),
            description: err.message || t("subscription.toasts.loadSubscriptionFailed"),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [toast, t]);

  const refreshBusiness = async () => {
    const res = await businessApi.getMyBusinesses({ force: true });
    if (res.success && res.data && res.data.length > 0) {
      setBusiness(res.data[0]);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const fetchInvoiceByPaymentId = async (paymentId: string) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await invoiceApi.listMyInvoices();
      const items = res.success && res.data ? res.data : [];
      const match = items.find((i) => i.payment?.paymentId === paymentId);
      if (match) return match;
      await new Promise((r) => setTimeout(r, 400));
    }
    return null;
  };

  const downloadInvoice = async (inv: Invoice) => {
    try {
      setDownloadingInvoice(true);
      const blob = await invoiceApi.downloadInvoicePdf(inv._id);
      downloadBlob(blob, `${inv.invoiceNumber}.pdf`);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("subscription.toasts.downloadFailedTitle"),
        description: err.message || t("subscription.toasts.downloadFailedDesc"),
      });
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const onDownloadFromList = async (inv: Invoice) => {
    try {
      setBusyInvoiceId(inv._id);
      const blob = await invoiceApi.downloadInvoicePdf(inv._id);
      downloadBlob(blob, `${inv.invoiceNumber}.pdf`);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("subscription.toasts.downloadFailedTitle"),
        description: err.message || t("subscription.toasts.downloadFailedDesc"),
      });
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const scrollToInvoices = (behavior: ScrollBehavior = "smooth") => {
    const el = document.getElementById("subscription-invoices");
    el?.scrollIntoView({ behavior, block: "start" });
  };

  useEffect(() => {
    const section = new URLSearchParams(location.search).get("section");
    if (section !== "invoices") return;
    if (loading) return;
    if (invoicesLoading) return;
    scrollToInvoices("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, loading, invoicesLoading]);

  const startUpgrade = async (plan: Plan) => {
    if (!business?._id) {
      toast({
        variant: "destructive",
        title: t("subscription.toasts.businessNotFoundTitle"),
        description: t("subscription.toasts.businessNotFoundDesc"),
      });
      return;
    }

    try {
      setUpgradingPlanId(plan._id);

      // Free plan: activate directly
      if (!plan.price || plan.price <= 0) {
        const subRes = await planApi.subscribeToPlan(plan._id, business._id);
        if (!subRes.success) throw new Error(subRes.message || t("subscription.errors.activatePlanFailed"));
        toast({ title: t("subscription.toasts.successTitle"), description: t("subscription.toasts.planActivatedDesc") });
        await refreshBusiness();
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok || !window.Razorpay) {
        throw new Error(t("subscription.errors.razorpayLoadFailed"));
      }

      const orderRes = await planApi.createRazorpayOrder(plan._id, business._id);
      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.message || t("subscription.errors.createPaymentOrderFailed"));
      }

      // Backend can return free shortcut too
      if ((orderRes.data as any).isFree) {
        const subRes = await planApi.subscribeToPlan(plan._id, business._id);
        if (!subRes.success) throw new Error(subRes.message || t("subscription.errors.activatePlanFailed"));
        toast({ title: t("subscription.toasts.successTitle"), description: t("subscription.toasts.planActivatedDesc") });
        await refreshBusiness();
        return;
      }

      const data = orderRes.data as any;
      const order = data.order;
      const keyId = data.keyId;

      const rzp = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "PublicDukan",
        description: plan.description || t("subscription.payment.purchasePlan", { planName: plan.name }),
        order_id: order.id,
        handler: async (response: any) => {
          setRecentInvoice(null);
          const verifyRes = await planApi.verifyRazorpayPayment({
            planId: plan._id,
            businessId: business._id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (!verifyRes.success) {
            toast({
              variant: "destructive",
              title: t("subscription.toasts.paymentFailedTitle"),
              description: verifyRes.message || t("subscription.errors.paymentVerificationFailed"),
            });
            return;
          }

          toast({ title: t("subscription.toasts.paymentSuccessTitle"), description: t("subscription.toasts.planActivatedDesc") });
          await refreshBusiness();

          try {
            const inv = await fetchInvoiceByPaymentId(response.razorpay_payment_id);
            if (inv) {
              setRecentInvoice(inv);
              toast({
                title: t("subscription.toasts.invoiceReadyTitle"),
                description: t("subscription.toasts.invoiceReadyDesc", { invoiceNumber: inv.invoiceNumber }),
              });
            }
          } catch {
            // ignore
          }
        },
        modal: {
          ondismiss: () => {
            setUpgradingPlanId(null);
          },
        },
        notes: order.notes,
        theme: {
          color: "#1DBF73",
        },
      });

      rzp.open();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("subscription.toasts.upgradeFailedTitle"),
        description: err.message || t("subscription.toasts.genericErrorDesc"),
      });
    } finally {
      setUpgradingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-52 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const currentPlanName = business?.plan && typeof business.plan !== "string" ? business.plan.name : t("subscription.freePlan");
  const expires = business?.planExpiresAt;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{t("subscription.title")}</h1>

      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
        <p className="text-sm text-muted-foreground">{t("subscription.currentPlan")}</p>
        <p className="text-xl font-bold text-primary flex items-center gap-2">
          <Crown className="w-5 h-5" /> {currentPlanName}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{t("subscription.expires", { date: formatDate(expires) })}</p>

        {recentInvoice ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => downloadInvoice(recentInvoice)}
              disabled={downloadingInvoice}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {downloadingInvoice ? t("subscription.downloading") : t("subscription.downloadInvoice")}
            </button>
            <button
              onClick={() => scrollToInvoices()}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-muted text-foreground"
            >
              {t("subscription.viewAllInvoices")}
            </button>
          </div>
        ) : null}
      </div>

      <div id="subscription-invoices" className="bg-card border rounded-xl p-4 space-y-3">
        <div>
          <p className="font-bold">{t("subscription.invoices.title")}</p>
          <p className="text-xs text-muted-foreground">{t("subscription.invoices.subtitle")}</p>
        </div>

        {entitlementsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : entitlements?.features?.invoicesEnabled !== true ? (
          <div className="text-sm text-muted-foreground">
            {t("subscription.invoices.notEnabled")}
          </div>
        ) : invoicesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("subscription.invoices.empty")}</div>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv._id} className="bg-background/50 border rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(inv.issuedAt)}</p>
                  {inv.business?.name ? (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{inv.business.name}</p>
                  ) : null}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">₹{inv.amount}</p>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      statusColor[inv.status] || "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t(`subscription.invoiceStatus.${inv.status}`, { defaultValue: inv.status })}
                  </span>
                </div>
                <button
                  onClick={() => onDownloadFromList(inv)}
                  disabled={busyInvoiceId === inv._id}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg disabled:opacity-60 shrink-0"
                  aria-label={t("subscription.invoices.downloadAria")}
                >
                  {busyInvoiceId === inv._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {plans.map((plan) => {
          const isCurrent = currentPlanId === plan._id;
          const lines = buildPlanFeatureSummary(plan.features, t);
          const isBusy = upgradingPlanId === plan._id;

          return (
            <motion.div
              key={plan._id}
              whileTap={{ scale: 0.98 }}
              className={`bg-card border rounded-xl p-4 ${plan.isPopular ? "ring-2 ring-primary" : ""}`}
            >
              {plan.isPopular && (
                <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  {t("subscription.popular")}
                </span>
              )}

              <div className="flex items-end gap-1 mt-1">
                <span className="text-2xl font-bold">₹{plan.price}</span>
                <span className="text-sm text-muted-foreground">{getPlanPeriodText(t, plan)}</span>
              </div>
              <p className="font-bold text-sm mt-1">{plan.name}</p>
              {plan.description ? <p className="text-xs text-muted-foreground mt-1">{plan.description}</p> : null}

              <ul className="mt-2 space-y-1">
                {lines.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent || isBusy}
                onClick={() => startUpgrade(plan)}
                className={`w-full mt-3 py-2.5 rounded-lg text-sm font-semibold ${
                  isCurrent
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {isCurrent
                  ? t("subscription.buttons.currentPlan")
                  : isBusy
                    ? t("subscription.buttons.processing")
                    : plan.price > 0
                      ? t("subscription.buttons.payAndUpgrade")
                      : t("subscription.buttons.activate")}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Subscription;
