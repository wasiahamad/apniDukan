import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { businessApi, invoiceApi, planApi, type Business, type Invoice, type Plan } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";
import { loadRazorpayScript } from "@/lib/razorpay";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPlanFeatureSummary } from "@/lib/planFeatures";

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
};

const Subscription = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [recentInvoice, setRecentInvoice] = useState<Invoice | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

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
      } catch (err: any) {
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: "Error",
            description: err.message || "Failed to load subscription data",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [toast]);

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
        title: "Download failed",
        description: err.message || "Failed to download invoice",
      });
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const startUpgrade = async (plan: Plan) => {
    if (!business?._id) {
      toast({
        variant: "destructive",
        title: "Business not found",
        description: "Please create a business first.",
      });
      return;
    }

    try {
      setUpgradingPlanId(plan._id);

      // Free plan: activate directly
      if (!plan.price || plan.price <= 0) {
        const subRes = await planApi.subscribeToPlan(plan._id, business._id);
        if (!subRes.success) throw new Error(subRes.message || "Failed to activate plan");
        toast({ title: "Success", description: "Plan activated successfully" });
        await refreshBusiness();
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok || !window.Razorpay) {
        throw new Error("Failed to load Razorpay");
      }

      const orderRes = await planApi.createRazorpayOrder(plan._id, business._id);
      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.message || "Failed to create payment order");
      }

      // Backend can return free shortcut too
      if ((orderRes.data as any).isFree) {
        const subRes = await planApi.subscribeToPlan(plan._id, business._id);
        if (!subRes.success) throw new Error(subRes.message || "Failed to activate plan");
        toast({ title: "Success", description: "Plan activated successfully" });
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
        name: "ApniDukan",
        description: plan.description || `Purchase ${plan.name}`,
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
              title: "Payment failed",
              description: verifyRes.message || "Payment verification failed",
            });
            return;
          }

          toast({ title: "Payment success", description: "Plan activated successfully" });
          await refreshBusiness();

          try {
            const inv = await fetchInvoiceByPaymentId(response.razorpay_payment_id);
            if (inv) {
              setRecentInvoice(inv);
              toast({
                title: "Invoice ready",
                description: `Invoice ${inv.invoiceNumber} generated.`,
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
        title: "Upgrade failed",
        description: err.message || "Something went wrong",
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

  const currentPlanName = business?.plan && typeof business.plan !== "string" ? business.plan.name : "Free";
  const expires = business?.planExpiresAt;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Subscription & Billing</h1>

      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
        <p className="text-sm text-muted-foreground">Current Plan</p>
        <p className="text-xl font-bold text-primary flex items-center gap-2">
          <Crown className="w-5 h-5" /> {currentPlanName}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Expires: {formatDate(expires)}</p>

        {recentInvoice ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => downloadInvoice(recentInvoice)}
              disabled={downloadingInvoice}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {downloadingInvoice ? "Downloading…" : "Download Invoice"}
            </button>
            <button
              onClick={() => navigate("/dashboard/invoices")}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-muted text-foreground"
            >
              View Invoices
            </button>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {plans.map((plan) => {
          const isCurrent = currentPlanId === plan._id;
          const lines = buildPlanFeatureSummary(plan.features);
          const isBusy = upgradingPlanId === plan._id;

          return (
            <motion.div
              key={plan._id}
              whileTap={{ scale: 0.98 }}
              className={`bg-card border rounded-xl p-4 ${plan.isPopular ? "ring-2 ring-primary" : ""}`}
            >
              {plan.isPopular && (
                <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  POPULAR
                </span>
              )}

              <div className="flex items-end gap-1 mt-1">
                <span className="text-2xl font-bold">₹{plan.price}</span>
                <span className="text-sm text-muted-foreground">/{plan.durationInDays} days</span>
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
                {isCurrent ? "Current Plan" : isBusy ? "Processing..." : plan.price > 0 ? "Pay & Upgrade" : "Activate"}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Subscription;
