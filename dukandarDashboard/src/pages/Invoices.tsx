import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { invoiceApi, type Invoice } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const statusColor: Record<string, string> = { paid: "bg-green-100 text-green-700" };

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
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

const Invoices = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await invoiceApi.listMyInvoices();
        if (!cancelled) {
          setInvoices(res.success && res.data ? res.data : []);
        }
      } catch (err: any) {
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: "Error",
            description: err.message || "Failed to load invoices",
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

  const onDownload = async (inv: Invoice) => {
    try {
      setBusyId(inv._id);
      const blob = await invoiceApi.downloadInvoicePdf(inv._id);
      downloadBlob(blob, `${inv.invoiceNumber}.pdf`);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: err.message || "Failed to download invoice",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Invoices</h1>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-card border rounded-xl p-6 text-sm text-muted-foreground">
          No invoices found.
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv._id} className="bg-card border rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold text-sm">{inv.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">{formatDate(inv.issuedAt)}</p>
                {inv.business?.name ? (
                  <p className="text-xs text-muted-foreground mt-0.5">{inv.business.name}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">₹{inv.amount}</p>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    statusColor[inv.status] || "bg-muted text-muted-foreground"
                  }`}
                >
                  {inv.status}
                </span>
              </div>
              <button
                onClick={() => onDownload(inv)}
                disabled={busyId === inv._id}
                className="p-2 text-primary hover:bg-primary/10 rounded-lg disabled:opacity-60"
                aria-label="Download invoice"
              >
                {busyId === inv._id ? (
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
  );
};

export default Invoices;
