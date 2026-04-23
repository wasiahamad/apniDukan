import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Save, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { businessApi, type Business } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const PREVIEW_BUBBLE_TEXT_COLOR = "#0f172a";

const WhatsAppSettings = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [number, setNumber] = useState("");
  const [orderMsg, setOrderMsg] = useState(() => t("whatsapp.defaults.orderTemplate"));
  const [autoGreetingEnabled, setAutoGreetingEnabled] = useState(true);
  const [greeting, setGreeting] = useState(() => t("whatsapp.defaults.greeting"));

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await businessApi.getMyBusinesses();
        const biz = res.success && res.data && res.data.length > 0 ? res.data[0] : null;
        if (!biz) {
          navigate("/onboarding");
          return;
        }
        if (cancelled) return;

        setBusiness(biz);
        setNumber(biz.whatsapp || "");
        setOrderMsg(
          biz.whatsappOrderMessageTemplate ||
            t("whatsapp.defaults.orderTemplate")
        );
        setAutoGreetingEnabled(biz.whatsappAutoGreetingEnabled ?? true);
        setGreeting(biz.whatsappAutoGreetingMessage || t("whatsapp.defaults.greeting"));
      } catch (err: any) {
        toast({
          title: t("whatsapp.toasts.errorTitle"),
          description: err.message || t("whatsapp.toasts.loadFailedDesc"),
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate, toast]);

  const previewOrder = useMemo(() => {
    const businessName = business?.name || t("whatsapp.preview.yourStore");
    return orderMsg
      .replace(/{{\s*business_name\s*}}/g, businessName)
      .replace(/{{\s*product_name\s*}}/g, t("whatsapp.preview.sampleProduct"))
      .replace(/{{\s*order_items\s*}}/g, t("whatsapp.preview.sampleItems"))
      .replace(/{{\s*total\s*}}/g, t("whatsapp.preview.sampleTotal"));
  }, [business?.name, orderMsg, t]);

  const previewFullMessage = useMemo(() => {
    const g = (greeting || "").trim();
    const o = (previewOrder || "").trim();
    if (autoGreetingEnabled && g) return `${g}\n\n${o}`.trim();
    return o;
  }, [autoGreetingEnabled, greeting, previewOrder]);

  const handleSave = async () => {
    if (!business?._id) return;

    try {
      setSaving(true);
      setSaved(false);

      const res = await businessApi.updateBusiness(business._id, {
        whatsapp: number || undefined,
        whatsappOrderMessageTemplate: orderMsg,
        whatsappAutoGreetingEnabled: autoGreetingEnabled,
        whatsappAutoGreetingMessage: greeting,
      });

      if (!res.success || !res.data) throw new Error(res.message || t("whatsapp.toasts.saveFailedDesc"));
      setBusiness(res.data);
      setSaved(true);
      toast({
        title: t("whatsapp.toasts.savedTitle"),
        description: t("whatsapp.toasts.savedDesc"),
      });
    } catch (err: any) {
      toast({
        title: t("whatsapp.toasts.saveErrorTitle"),
        description: err.message || t("whatsapp.toasts.saveFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{t("whatsapp.title")}</h1>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-sm">{t("whatsapp.businessNumber.title")}</h3>
        <input value={number} onChange={e => { setNumber(e.target.value); setSaved(false); }}
          className="w-full px-3 py-2.5 bg-muted border rounded-lg text-sm" placeholder={t("whatsapp.businessNumber.placeholder")} />
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-sm">{t("whatsapp.orderMessage.title")}</h3>
        <textarea value={orderMsg} onChange={e => { setOrderMsg(e.target.value); setSaved(false); }} rows={3}
          className="w-full px-3 py-2.5 bg-muted border rounded-lg text-sm resize-none" />
        <p className="text-xs text-muted-foreground">
          {t("whatsapp.orderMessage.placeholdersLabel")}: {"{{business_name}}"}, {"{{product_name}}"}, {"{{order_items}}"}, {"{{total}}"}
        </p>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-sm">{t("whatsapp.autoGreeting.title")}</h3>
          <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={autoGreetingEnabled}
              onChange={(e) => { setAutoGreetingEnabled(e.target.checked); setSaved(false); }}
              className="h-4 w-4 accent-primary"
            />
            {t("whatsapp.autoGreeting.enabled")}
          </label>
        </div>
        <textarea value={greeting} onChange={e => { setGreeting(e.target.value); setSaved(false); }} rows={2}
          className="w-full px-3 py-2.5 bg-muted border rounded-lg text-sm resize-none" />
      </div>

      <div className="bg-card border rounded-xl p-4">
        <h3 className="font-bold text-sm mb-3">{t("whatsapp.preview.title")}</h3>
        <div className="bg-green-50 rounded-xl p-3 space-y-2">
          <div
            className="bg-green-100 rounded-lg p-2.5 text-sm shadow-sm max-w-[90%] ml-auto whitespace-pre-wrap"
            style={{ color: PREVIEW_BUBBLE_TEXT_COLOR }}
          >
            {previewFullMessage}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {t("whatsapp.preview.note")}
        </p>
      </div>

      <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold shadow-lg shadow-primary/20 disabled:opacity-70">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? t("whatsapp.actions.saved") : t("whatsapp.actions.save")}
      </motion.button>
    </div>
  );
};

export default WhatsAppSettings;
