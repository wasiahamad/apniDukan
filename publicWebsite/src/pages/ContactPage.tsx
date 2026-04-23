import { useEffect, useState } from "react";
import { MessageCircle, Mail, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import PageTransition from "@/components/PageTransition";
import ScrollReveal from "@/components/ScrollReveal";
import StaggerChildren, { StaggerItem } from "@/components/StaggerChildren";
import { fetchContactSettings, submitContactMessage, type ContactSettings } from "@/lib/publicShopsApi";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

const defaultSettings: ContactSettings = {
  whatsappNumber: "919876543210",
  email: "support@publicdukan.in",
  officeAddress: "123, Startup Hub, Connaught Place, New Delhi - 110001",
};

const formatWhatsappDisplay = (raw: string) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) {
    const n = digits.slice(2);
    return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
  }
  return `+${digits}`;
};

export default function ContactPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [settings, setSettings] = useState<ContactSettings>(defaultSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const resolvedName = isAuthenticated ? String(user?.name || "").trim() : "";
  const resolvedEmail = isAuthenticated ? String(user?.email || "").trim() : "";

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!resolvedName && !resolvedEmail) return;

    setForm((prev) => ({
      name: prev.name || resolvedName,
      email: prev.email || resolvedEmail,
      message: prev.message,
    }));
  }, [isAuthenticated, resolvedEmail, resolvedName]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingSettings(true);
        const s = await fetchContactSettings();
        if (!cancelled) setSettings({
          whatsappNumber: s.whatsappNumber || defaultSettings.whatsappNumber,
          email: s.email || defaultSettings.email,
          officeAddress: s.officeAddress || defaultSettings.officeAddress,
        });
      } catch {
        // keep defaults silently
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await submitContactMessage({
        name: form.name,
        email: form.email,
        message: form.message,
      });
      toast({ title: t("contact.toast.sentTitle"), description: t("contact.toast.sentDesc") });
      setForm({ name: "", email: "", message: "" });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("contact.toast.failedTitle"),
        description: err?.message || t("contact.toast.failedDesc"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="container py-16">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{t("contact.title")}</h1>
            <p className="text-muted-foreground">{t("contact.subtitle")}</p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <StaggerChildren className="space-y-4">
            <StaggerItem>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("contact.whatsapp")}</p>
                    <a
                      href={settings.whatsappNumber ? `https://wa.me/${encodeURIComponent(settings.whatsappNumber)}` : "#"}
                      className="font-medium text-primary"
                    >
                      {loadingSettings ? t("contact.loading") : formatWhatsappDisplay(settings.whatsappNumber) || "—"}
                    </a>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("contact.email")}</p>
                    <a
                      href={settings.email ? `mailto:${settings.email}` : "#"}
                      className="font-medium"
                    >
                      {loadingSettings ? t("contact.loading") : settings.email || "—"}
                    </a>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("contact.office")}</p>
                    <p className="font-medium text-sm">{loadingSettings ? t("contact.loading") : settings.officeAddress || "—"}</p>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerChildren>

          <ScrollReveal delay={0.2}>
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t("contact.form.name")}</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      required
                      readOnly={Boolean(resolvedName)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t("contact.form.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      required
                      readOnly={Boolean(resolvedEmail)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="msg">{t("contact.form.message")}</Label>
                    <Textarea id="msg" rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={submitting}>
                    <Send className="h-4 w-4" /> {submitting ? t("contact.form.sending") : t("contact.form.send")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </div>
    </PageTransition>
  );
}
