import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Eye, TrendingUp, Package, MessageSquare, Users, Clock, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { businessApi, type Business } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type WorkingDay = {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

type CustomSocialLink = {
  label: string;
  url: string;
};

const BusinessProfile = () => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingSocial, setConnectingSocial] = useState<null | "facebook" | "instagram" | "twitter" | "youtube">(null);
  const [customSocialDialogOpen, setCustomSocialDialogOpen] = useState(false);
  const [customSocialForm, setCustomSocialForm] = useState<CustomSocialLink>({ label: "", url: "" });
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { entitlements } = useEntitlements();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const [form, setForm] = useState({
    name: "",
    description: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: { street: "", city: "", state: "", pincode: "" },
    socialMedia: { facebook: "", instagram: "", twitter: "", youtube: "" },
    socialMediaCustom: [] as CustomSocialLink[],
    openStatusMode: "auto" as "auto" | "open" | "closed",
  });

  const [workingHours, setWorkingHours] = useState<Record<string, WorkingDay>>(
    DAYS.reduce((acc, day) => ({
      ...acc,
      [day]: { day, open: "09:00", close: "20:00", isOpen: day !== "sunday" },
    }), {})
  );

  useEffect(() => {
    loadBusiness();
  }, []);

  useEffect(() => {
    const social = searchParams.get("social");
    const status = searchParams.get("status");
    const message = searchParams.get("message");
    if (!social || !status) return;

    if (status === "connected") {
      toast({
        title: "Connected",
        description: `${social} connected successfully`,
      });
      loadBusiness();
    } else if (status === "failed") {
      toast({
        title: "Connect failed",
        description: message || `Could not connect ${social}`,
        variant: "destructive",
      });
    }

    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  const loadGoogleScript = () =>
    new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google SDK"));
      document.body.appendChild(script);
    });

  const connectYoutubeViaGoogle = async () => {
    if (!business) return;
    if (!googleClientId) {
      throw new Error("Google is not configured. Please set VITE_GOOGLE_CLIENT_ID.");
    }

    await loadGoogleScript();
    const google = (window as any).google;
    if (!google?.accounts?.oauth2?.initTokenClient) {
      throw new Error("Google SDK unavailable");
    }

    const accessToken = await new Promise<string>((resolve, reject) => {
      let settled = false;
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "https://www.googleapis.com/auth/youtube.readonly openid email profile",
        callback: (response: any) => {
          settled = true;
          if (response?.error) {
              const rawError = String(response.error || "").toLowerCase();
              const rawDescription = String(response.error_description || "").toLowerCase();
              if (rawError === "access_denied" || rawDescription.includes("not completed the google verification process")) {
                reject(
                  new Error(
                    "Google app abhi testing mode me hai. Is Google account ko OAuth test user list me add karein, ya app verify/publish karein."
                  )
                );
                return;
              }
              reject(new Error(response.error_description || response.error || "Google connect failed"));
            return;
          }
          if (!response?.access_token) {
            reject(new Error("Google access token not received"));
            return;
          }
          resolve(response.access_token);
        },
      });

      tokenClient.requestAccessToken({ prompt: "consent" });
      window.setTimeout(() => {
        if (!settled) {
          reject(
            new Error(
              "Google access blocked or timed out. OAuth app testing mode me ho sakta hai. Apna Gmail test users me add karein (Google Cloud Console > OAuth consent screen > Test users)."
            )
          );
        }
      }, 20000);
    });

    const res = await businessApi.connectYoutubeWithToken(business._id, accessToken);
    if (!res.success) {
      throw new Error(res.message || "Failed to connect YouTube");
    }

    toast({
      title: "Connected",
      description: "YouTube connected successfully",
    });
    await loadBusiness();
  };

  const loadBusiness = async () => {
    try {
      setLoading(true);
      const res = await businessApi.getMyBusinesses();
      if (res.success && res.data && res.data.length > 0) {
        const biz = res.data[0];
        setBusiness(biz);
        setForm({
          name: biz.name || "",
          description: biz.description || "",
          phone: biz.phone || "",
          whatsapp: biz.whatsapp || "",
          email: biz.email || "",
          address: biz.address || { street: "", city: "", state: "", pincode: "" },
          socialMedia: {
            facebook: biz.socialMedia?.facebook || "",
            instagram: biz.socialMedia?.instagram || "",
            twitter: biz.socialMedia?.twitter || "",
            youtube: biz.socialMedia?.youtube || "",
          },
          socialMediaCustom: (biz.socialMediaCustom || []).filter((item) => item?.label && item?.url),
          openStatusMode: (biz as any).openStatusMode || "auto",
        });

        // Load working hours from backend
        if (biz.workingHours) {
          const hours: Record<string, WorkingDay> = {};
          DAYS.forEach((day) => {
            const dayData = (biz.workingHours as any)?.[day];
            hours[day] = {
              day,
              open: dayData?.open || "09:00",
              close: dayData?.close || "20:00",
              isOpen: dayData?.isOpen !== false,
            };
          });
          setWorkingHours(hours);
        }
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load business data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!business) return;
    
    try {
      setSaving(true);

      // Convert workingHours to the format expected by backend
      const workingHoursData = DAYS.reduce((acc, day) => ({
        ...acc,
        [day]: workingHours[day],
      }), {});

      const res = await businessApi.updateBusiness(business._id, {
        name: form.name,
        description: form.description,
        phone: form.phone,
        whatsapp: form.whatsapp,
        email: form.email,
        address: form.address,
        socialMedia: {
          facebook: form.socialMedia.facebook,
          instagram: form.socialMedia.instagram,
          twitter: form.socialMedia.twitter,
          youtube: form.socialMedia.youtube,
        },
        socialMediaCustom: (form.socialMediaCustom || [])
          .filter((item) => item.label.trim() && item.url.trim())
          .map((item) => ({ label: item.label.trim(), url: item.url.trim() })),
        workingHours: workingHoursData as any,
        openStatusMode: form.openStatusMode,
      });

      if (res.success) {
        toast({
          title: "Success",
          description: "Business profile updated successfully",
        });
        await loadBusiness(); // Reload to get updated data
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateAddress = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));
  };

  const addCustomSocial = () => {
    const label = customSocialForm.label.trim();
    const url = customSocialForm.url.trim();
    if (!label || !url) {
      toast({ title: "Missing fields", description: "Please enter platform name and URL", variant: "destructive" });
      return;
    }

    setForm((prev) => ({
      ...prev,
      socialMediaCustom: [...(prev.socialMediaCustom || []), { label, url }],
    }));
    setCustomSocialForm({ label: "", url: "" });
    setCustomSocialDialogOpen(false);
  };

  const removeCustomSocial = (index: number) => {
    setForm((prev) => ({
      ...prev,
      socialMediaCustom: (prev.socialMediaCustom || []).filter((_, i) => i !== index),
    }));
  };

  const handleConnectSocial = async (platform: "facebook" | "instagram" | "twitter" | "youtube") => {
    if (!business) return;
    try {
      setConnectingSocial(platform);

      if (platform === "youtube") {
        await connectYoutubeViaGoogle();
        return;
      }

      const res = await businessApi.getSocialOAuthUrl(platform, business._id);
      const url = res?.data?.url;
      if (!res.success || !url) {
        throw new Error(res.message || "Failed to start connect flow");
      }

      window.location.href = url;
    } catch (err: any) {
      const message = err.message || "Failed to start connect";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setConnectingSocial(null);
    }
  };

  const updateWorkingHours = (day: string, field: keyof WorkingDay, value: any) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const Field = ({ 
    label, 
    value, 
    onChange, 
    type = "text", 
    placeholder = "" 
  }: { 
    label: string; 
    value: string; 
    onChange: (v: string) => void; 
    type?: string; 
    placeholder?: string;
  }) => (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-muted border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
      />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Business Profile</h1>
        {business?.slug && entitlements?.features?.publicShopEnabled === true && (
          <button 
            onClick={() => navigate(`/shop/${business.slug}`)} 
            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            <Eye className="w-3.5 h-3.5" /> Preview Shop
          </button>
        )}
      </div>

      {/* Stats Section */}
      {business && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Listings</span>
            </div>
            <p className="text-2xl font-bold">{business.stats.totalListings}</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Inquiries</span>
            </div>
            <p className="text-2xl font-bold">{business.stats.totalInquiries}</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Views</span>
            </div>
            <p className="text-2xl font-bold">{business.stats.totalViews}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Status</span>
            </div>
            <p className="text-sm font-semibold text-green-600">
              {business.isActive ? "Active" : "Inactive"}
            </p>
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-sm">Basic Info</h3>
        <Field label="Business Name" value={form.name} onChange={(v) => updateForm("name", v)} />
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
          <textarea 
            value={form.description} 
            onChange={(e) => updateForm("description", e.target.value)} 
            rows={3}
            placeholder="Describe your business..."
            className="w-full px-3 py-2.5 bg-muted border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" 
          />
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-sm">Contact</h3>
        <Field label="Phone Number" value={form.phone} onChange={(v) => updateForm("phone", v)} />
        <Field label="WhatsApp Number" value={form.whatsapp} onChange={(v) => updateForm("whatsapp", v)} />
        <Field label="Email" value={form.email} onChange={(v) => updateForm("email", v)} type="email" />
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-sm">Social Media Links</h3>
          <button
            type="button"
            onClick={() => setCustomSocialDialogOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground"
          >
            <Plus className="w-3.5 h-3.5" /> Add Social Media
          </button>
        </div>
        <p className="text-xs text-muted-foreground">These links show on your public shop footer.</p>
        <div className="grid grid-cols-1 gap-4">
          {([
            { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
            { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
            { key: "twitter", label: "Twitter / X", placeholder: "https://x.com/yourhandle" },
            { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
          ] as const).map((item) => (
            <div key={item.key} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-medium text-muted-foreground block">{item.label}</label>
                <button
                  type="button"
                  onClick={() => handleConnectSocial(item.key)}
                  disabled={connectingSocial === item.key}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-60"
                >
                  {connectingSocial === item.key ? "Connecting..." : "Connect"}
                </button>
              </div>
              {form.socialMedia[item.key] ? (
                <a
                  href={form.socialMedia[item.key]}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> {form.socialMedia[item.key]}
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">Not connected</p>
              )}
            </div>
          ))}

          {(form.socialMediaCustom || []).map((item, idx) => (
            <div key={`${item.label}-${idx}`} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-medium text-muted-foreground block">{item.label}</label>
                <button
                  type="button"
                  onClick={() => removeCustomSocial(idx)}
                  className="inline-flex items-center gap-1 text-xs text-destructive font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {item.url}
              </a>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={customSocialDialogOpen} onOpenChange={setCustomSocialDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Social Media</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field
              label="Platform Name"
              value={customSocialForm.label}
              onChange={(v) => setCustomSocialForm((prev) => ({ ...prev, label: v }))}
              placeholder="e.g. LinkedIn, Telegram"
            />
            <Field
              label="Profile URL"
              value={customSocialForm.url}
              onChange={(v) => setCustomSocialForm((prev) => ({ ...prev, url: v }))}
              placeholder="https://..."
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCustomSocialDialogOpen(false);
                  setCustomSocialForm({ label: "", url: "" });
                }}
                className="px-3 py-2 text-xs font-semibold rounded-lg border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addCustomSocial}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground"
              >
                Add Link
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-sm">Address</h3>
        <Field label="Street Address" value={form.address.street} onChange={(v) => updateAddress("street", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" value={form.address.city} onChange={(v) => updateAddress("city", v)} />
          <Field label="State" value={form.address.state} onChange={(v) => updateAddress("state", v)} />
        </div>
        <Field label="Pincode" value={form.address.pincode} onChange={(v) => updateAddress("pincode", v)} />
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Working Hours</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Set your business hours for each day of the week</p>

        <div className="bg-muted/40 border rounded-xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Shop Open/Close</p>
              <p className="text-xs text-muted-foreground">Auto uses working hours. Manual lets you force open/closed.</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={form.openStatusMode !== "auto"}
                onChange={(e) => updateForm("openStatusMode", e.target.checked ? "open" : "auto")}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Manual
            </label>
          </div>

          {form.openStatusMode !== "auto" && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => updateForm("openStatusMode", "open")}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  form.openStatusMode === "open"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border"
                }`}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => updateForm("openStatusMode", "closed")}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  form.openStatusMode === "closed"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-border"
                }`}
              >
                Closed
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3 pb-3 border-b last:border-b-0">
              <div className="flex items-center gap-2 w-28">
                <input
                  type="checkbox"
                  checked={workingHours[day].isOpen}
                  onChange={(e) => updateWorkingHours(day, "isOpen", e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label className="text-sm font-medium capitalize">{DAY_LABELS[day]}</label>
              </div>
              
              {workingHours[day].isOpen ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={workingHours[day].open}
                    onChange={(e) => updateWorkingHours(day, "open", e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-muted border rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="time"
                    value={workingHours[day].close}
                    onChange={(e) => updateWorkingHours(day, "close", e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-muted border rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-sm">Why Choose Us</h3>
        <p className="text-xs text-muted-foreground">
          Auto-filled from your Business Type. Changes are managed by admin.
        </p>

        {Array.isArray((business as any)?.businessType?.whyChooseUsTemplates) && (business as any)?.businessType?.whyChooseUsTemplates?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(business as any).businessType.whyChooseUsTemplates
              .filter((x: any) => String(x?.title || "").trim() || String(x?.desc || "").trim())
              .slice(0, 12)
              .map((c: any, idx: number) => (
                <div key={idx} className="bg-muted/40 border rounded-xl p-3 space-y-1">
                  <p className="text-sm font-semibold text-foreground">{String(c?.title || "—")}</p>
                  <p className="text-xs text-muted-foreground">{String(c?.desc || "")}</p>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No defaults set for this Business Type.</p>
        )}
      </div>

      <motion.button 
        whileTap={{ scale: 0.97 }} 
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold shadow-lg shadow-primary/20 disabled:opacity-50"
      >
        <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
      </motion.button>
    </div>
  );
};

export default BusinessProfile;
