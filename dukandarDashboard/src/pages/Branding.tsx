import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Save, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { aiApi, businessApi, uploadApi, type Business } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntitlements } from "@/contexts/EntitlementsContext";

const FONT_OPTIONS = ["Plus Jakarta Sans", "Inter", "Poppins", "Roboto"] as const;
const PLATFORM_LOGO_SRC = "/logo-removebg-preview.png";

const Branding = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { entitlements } = useEntitlements();

  const aiToolsEnabled = entitlements?.features?.aiDukandarAgentEnabled === true;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [business, setBusiness] = useState<Business | null>(null);

  const [themeColor, setThemeColor] = useState("#1DBF73");
  const [backgroundColor, setBackgroundColor] = useState("#F3F4F6");
  const [fontColor, setFontColor] = useState("#111827");
  const [fontFamily, setFontFamily] = useState<(typeof FONT_OPTIONS)[number]>("Plus Jakarta Sans");

  const [logo, setLogo] = useState<string>("");
  const [coverImage, setCoverImage] = useState<string>("");

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
        const b = res.success && res.data && res.data.length > 0 ? res.data[0] : null;
        if (!b) {
          navigate("/onboarding");
          return;
        }
        if (cancelled) return;
        setBusiness(b);
        setLogo(b.logo || PLATFORM_LOGO_SRC);
        setCoverImage(b.coverImage || "");
        setThemeColor(b.branding?.themeColor || "#1DBF73");
        setBackgroundColor(b.branding?.backgroundColor || "#F3F4F6");
        setFontColor(b.branding?.fontColor || "#111827");
        setFontFamily((b.branding?.fontFamily as any) || "Plus Jakarta Sans");
      } catch (err: any) {
        toast({
          title: t("branding.toasts.errorTitle"),
          description: err.message || t("branding.toasts.loadBusinessFailedDesc"),
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

  const previewStyles = useMemo(
    () => ({
      fontFamily,
      backgroundColor,
      color: fontColor,
    }),
    [backgroundColor, fontColor, fontFamily]
  );

  const uploadOne = async (file: File, kind: "logo" | "cover") => {
    if (kind === "logo") setUploadingLogo(true);
    else setUploadingCover(true);

    try {
      const res = await uploadApi.uploadImage(file, "apnidukan/business");
      if (!res.success || !res.data?.url) throw new Error(res.message || t("branding.toasts.uploadFailedDesc"));
      if (kind === "logo") setLogo(res.data.url);
      else setCoverImage(res.data.url);
    } catch (err: any) {
      toast({
        title: t("branding.toasts.uploadErrorTitle"),
        description: err.message || t("branding.toasts.uploadFailedDesc"),
        variant: "destructive",
      });
    } finally {
      if (kind === "logo") setUploadingLogo(false);
      else setUploadingCover(false);
    }
  };

  const saveBranding = async () => {
    if (!business?._id) return;

    setSaving(true);
    try {
      const res = await businessApi.updateBusiness(business._id, {
        logo: logo || PLATFORM_LOGO_SRC,
        coverImage: coverImage || undefined,
        branding: {
          themeColor,
          backgroundColor,
          fontColor,
          fontFamily,
        },
      });

      if (!res.success || !res.data) throw new Error(res.message || t("branding.toasts.saveFailedDesc"));
      setBusiness(res.data);
      toast({
        title: t("branding.toasts.savedTitle"),
        description: t("branding.toasts.savedDesc"),
      });
    } catch (err: any) {
      toast({
        title: t("branding.toasts.errorTitle"),
        description: err.message || t("branding.toasts.saveFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAiError = (err: any, fallbackMsg: string) => {
    const status = err?.status;
    if (status === 403) {
      toast({
        title: t("branding.toasts.errorTitle"),
        description: err?.message || t("subscription.aiNotAvailable", { defaultValue: "AI tools are not available for your current plan." }),
        variant: "destructive",
      });
      return;
    }
    if (status === 429) {
      toast({
        title: t("branding.toasts.errorTitle"),
        description: err?.message || t("subscription.aiDailyLimit", { defaultValue: "Daily AI limit reached. Try tomorrow." }),
        variant: "destructive",
      });
      return;
    }
    toast({
      title: t("branding.toasts.errorTitle"),
      description: err?.message || fallbackMsg,
      variant: "destructive",
    });
  };

  const generateBrandingAi = async () => {
    if (!aiToolsEnabled) {
      toast({
        title: t("branding.toasts.errorTitle"),
        description: t("subscription.aiNotAvailable", { defaultValue: "AI tools are not available for your current plan." }),
        variant: "destructive",
      });
      return;
    }

    try {
      setAiLoading(true);
      const res = await aiApi.generate({ mode: "branding" });
      if (!res.success || !res.data) throw new Error(res.message || "AI generate failed");

      const data: any = res.data;
      if (data.themeColor) setThemeColor(String(data.themeColor));
      if (data.backgroundColor) setBackgroundColor(String(data.backgroundColor));
      if (data.fontColor) setFontColor(String(data.fontColor));
      if (data.fontFamily && (FONT_OPTIONS as readonly string[]).includes(String(data.fontFamily))) {
        setFontFamily(String(data.fontFamily) as any);
      }

      toast({
        title: t("branding.toasts.savedTitle"),
        description: t("branding.ai.generated", { defaultValue: "AI suggestions applied. Review and Save." }),
      });
    } catch (err: any) {
      handleAiError(err, t("branding.toasts.saveFailedDesc"));
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (!business) {
    return null;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{t("branding.title")}</h1>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-sm">{t("branding.logo.title")}</h3>
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 bg-muted rounded-xl border overflow-hidden flex items-center justify-center">
            {logo ? (
              <img src={logo} alt={t("branding.logo.alt")} className="h-full w-full object-contain p-2" />
            ) : (
              <span className="text-muted-foreground text-xs">{t("branding.logo.empty")}</span>
            )}
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold cursor-pointer">
            {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploadingLogo ? t("branding.actions.uploading") : t("branding.actions.upload")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingLogo}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadOne(f, "logo");
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-sm">{t("branding.cover.title")}</h3>
        <div className="w-full h-40 bg-muted rounded-xl border overflow-hidden flex items-center justify-center relative">
          {coverImage ? (
            <img src={coverImage} alt={t("branding.cover.alt")} className="h-full w-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-xs">{t("branding.cover.empty")}</span>
          )}
          <div className="absolute bottom-3 right-3">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card/90 hover:bg-card text-sm font-semibold cursor-pointer">
              {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadingCover ? t("branding.actions.uploading") : t("branding.actions.uploadCover")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingCover}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadOne(f, "cover");
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-sm">{t("branding.colors.title")}</h3>
          <button
            type="button"
            onClick={() => void generateBrandingAi()}
            disabled={aiLoading || !aiToolsEnabled}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t("branding.ai.generate", { defaultValue: "Suggest with AI" })}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">{t("branding.colors.theme")}</p>
            <div className="flex items-center gap-3">
              <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer" />
              <span className="text-sm font-mono text-muted-foreground">{themeColor}</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">{t("branding.colors.background")}</p>
            <div className="flex items-center gap-3">
              <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer" />
              <span className="text-sm font-mono text-muted-foreground">{backgroundColor}</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">{t("branding.colors.font")}</p>
            <div className="flex items-center gap-3">
              <input type="color" value={fontColor} onChange={e => setFontColor(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer" />
              <span className="text-sm font-mono text-muted-foreground">{fontColor}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-sm">{t("branding.font.title")}</h3>
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setFontFamily(f)}
              className={`px-3 py-2.5 rounded-lg text-sm border transition-all ${fontFamily === f ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:border-primary/40"}`}
              style={{ fontFamily: f }}
              type="button"
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4">
        <h3 className="font-bold text-sm mb-3">{t("branding.preview.title")}</h3>
        <div className="rounded-xl overflow-hidden border" style={previewStyles as any}>
          <div className="h-20" style={{ background: themeColor }} />
          <div className="p-3 text-center" style={{ background: backgroundColor, color: fontColor }}>
            <p className="font-bold text-sm">{business.name}</p>
            <p className="text-xs" style={{ opacity: 0.8 }}>{business.category?.name || ""}</p>
          </div>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => void saveBranding()}
        disabled={saving || uploadingLogo || uploadingCover}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold shadow-lg shadow-primary/20 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {t("branding.actions.save")}
      </motion.button>
    </div>
  );
};

export default Branding;
